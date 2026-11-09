import { financialDocuments } from "./financial-documents";
import { walletFundingAction } from "./wallet-funding";
import { dispatchCentre } from "./dispatch-centre";
import { vehicleProducts } from "./vehicle-products";
import { estimateDispatchRoute } from "./dispatch-routing";
import { serviceInvoiceAction } from "./service-invoices";
import { technicianJobs } from "./technician-mobile";
import { inventoryWorkspace } from "./inventory-workspace";
import { adminDashboard, adminSearch } from "./admin-dashboard";
import { technicianSessionPermission } from "./technician-session";
import { driverWorkspace, driverSessionPermission } from "./driver-workspace";
import { deliveryPhotoHistory } from "./delivery-photos";
import { driverOperations } from "./driver-operations";
import { bulkLPG } from "./bulk-lpg";
import { winbackCRM } from "./winback-crm";
import { doorstepAmendments } from "./doorstep-amendments";
import { invoiceCorrections } from "./invoice-corrections";
import { phoneActivation, publicPhoneActions } from "./phone-activation";
import { channelAction } from "./channel-messaging";
import { invoiceAction } from "./invoices";
import { assistedOrdering } from "./assisted-ordering";
import { mailAction } from "./transactional-mail";
import { rewardOfferAction } from "./reward-offers";
import { referralAction } from "./rewards-referrals";
import { rewardsAction } from "./rewards";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";
import { trackingAction, deliveryManifest } from "./order-tracking";
import { testimonialAction } from "./testimonials";
import {
  businessOperation,
  requiredBusinessOperation,
  operationOutcome,
} from "./business-operation";
import { customerManagement } from "./customer-management";
import { customerDashboard } from "./customer-dashboard";
import { navigationAccess, navigationSnapshot } from "./navigation";
import { inventoryBusiness } from "./inventory-business";
import { businessReporting } from "./business-reporting";
import { approvalWorkflowAction } from "./approval-workflow";
import { gasDeliveryAction, gasCatalogue, gasQuote } from "./gas-delivery";
import { staffAction } from "./staff";
import { readiness } from "./readiness";
import { bundleAction } from "./bundles";
import { followupAction } from "./service-followups";
import { policyAction } from "./policies";
import { financialReports } from "./financial-reports";
import { recordFailure } from "./observability";
import { mixedCheckoutAction } from "./mixed-checkout";
import { catalogueAction } from "./catalogue";
import { professionalServiceAction } from "./professional-services";
import { delegationAction, delegatedAuthority } from "./delegation";
import { schedulingAction } from "./scheduling";
import { commerceAction } from "./commerce";
import { refillAction } from "./refills";
import { accountAction, publicAccountActions } from "./accounts";
import { workspaceAction } from "./workspace";
import { z } from "zod";
import { completeDelivery, reconcileCash } from "./delivery";
import { getDb, one, type DB, type SQL, type Row } from "./db";
import {
  actor,
  allow,
  AppError,
  digest,
  hashPassword,
  passwordMatches,
  issueSession,
  id,
  type Actor,
} from "./auth";
import {
  audit,
  propose,
  decide,
  activate,
  emergencyDisable,
  definition,
} from "./governance";
import {
  checkout,
  checkoutSchema,
  transitionOrder,
  receiveStock,
  settingValue,
} from "./operations";
const scopeSchema = z.string().min(1).max(100);
const absentAccountHash = hashPassword("no-valid-account-placeholder");
const credentials = z
  .object({
    email: z
      .email()
      .max(200)
      .transform((v) => v.toLowerCase().trim()),
    password: z.string().min(12).max(128),
  })
  .strict();
export async function dispatch(
  action: string,
  token: string | null,
  input: unknown = {},
  database?: DB,
): Promise<any> {
  const db = database ?? (await getDb());
  let user: Actor | null = null;
  try {
    if (action === "dispatch.route.estimate")
      return await estimateDispatchRoute(db, token, input);
    return await db.transaction(async (tx) => {
      // All dashboard widgets share one committed snapshot; this facade cannot mutate business records.
      if (
        [
          "admin.dashboard",
          "technician.jobs",
          "technician.snapshot",
          "inventory.workspace",
          "inventory.movements",
        ].includes(action)
      )
        await tx.exec(
          "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
        );
      if (action === "testimonials.public")
        return testimonialAction(tx, action, null, input);
      if (action === "health") {
        await tx.query("SELECT 1");
        return { status: "ok" };
      }
      if (action === "compatibility")
        return catalogueAction(tx, action, null, input);
      if (action === "bundles") return bundleAction(tx, action, null, input);
      if (action === "policies") return policyAction(tx, action, null, input);
      if (["services.catalogue", "services.slots"].includes(action))
        return professionalServiceAction(tx, action, null, input);
      if (publicPhoneActions.has(action))
        return phoneActivation(tx, null, action, input);
      if (publicAccountActions.has(action))
        return accountAction(tx, action, null, input);
      if (action === "gas.quote") {
        const d = z
          .object({
            branchId: z.string().optional(),
            items: z
              .array(
                z
                  .object({
                    productId: z.string().max(100),
                    quantity: z.number().int().min(1).max(20),
                  })
                  .strict(),
              )
              .max(30)
              .optional(),
            lines: z
              .array(
                z
                  .object({
                    capacityKg: z.number().positive(),
                    kg: z.number().positive(),
                  })
                  .strict(),
              )
              .min(1)
              .max(20),
          })
          .strict()
          .parse(input);
        return gasQuote(tx, d.lines, d.branchId, d.items);
      }
      if (action === "gas.catalogue") {
        const d = z
          .object({ branchId: z.string().optional() })
          .strict()
          .parse(input);
        return gasCatalogue(tx, d.branchId);
      }
      if (action === "catalogue") {
        const d = z
          .object({ view: z.enum(["homepage"]).optional() })
          .strict()
          .parse(input);
        return {
          preview:
            process.env.NODE_ENV !== "production" && d.view !== "homepage",
          products: (
            await tx.query(
              "SELECT p.*,(SELECT id FROM media_assets m WHERE m.product_id=p.id AND m.archived=false ORDER BY position,created_at LIMIT 1) AS image_id,(SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'alt',m.alt) ORDER BY m.position,m.created_at),'[]'::jsonb) FROM media_assets m WHERE m.product_id=p.id AND m.archived=false) AS images,CASE WHEN p.category='Gas refills' THEN round(p.size_kg*(SELECT (value::text)::numeric FROM settings WHERE key='gas.price_per_kg' AND scope='lagos'))::bigint ELSE i.price_kobo END AS price_kobo,i.published,CASE WHEN p.category='Gas refills' THEN floor(COALESCE((SELECT grams-reserved_grams FROM gas_stock WHERE branch_id='lagos'),0)/NULLIF(p.size_kg*1000,0))::bigint ELSE COALESCE(i.quantity-i.reserved,0) END AS available FROM products p LEFT JOIN inventory i ON i.product_id=p.id AND i.branch_id='lagos' WHERE p.archived=false AND EXISTS(SELECT 1 FROM product_categories c WHERE c.name=p.category AND c.active=true) AND ($1::boolean OR i.published=true) ORDER BY p.size_kg NULLS LAST,p.name LIMIT $2",
              [
                process.env.NODE_ENV !== "production" && d.view !== "homepage",
                d.view === "homepage" ? 12 : null,
              ],
            )
          ).rows.map((p) => ({ ...p, available: Number(p.available) })),
          website: await settingValue(tx, "website.content"),
          homeServices: (
            await tx.query(
              "SELECT s.id,s.name,s.config,(SELECT id FROM media_assets m WHERE m.service_id=s.id AND m.branch_id=s.branch_id AND m.archived=false ORDER BY position,created_at LIMIT 1) AS image_id FROM service_catalogue s WHERE s.branch_id='lagos' AND (s.config->>'active')::boolean=true ORDER BY name LIMIT 3",
            )
          ).rows,
          categories: (
            await tx.query(
              "SELECT name FROM product_categories WHERE active=true ORDER BY name",
            )
          ).rows.map((r) => r.name),
          gas: await gasCatalogue(tx),
          walletEnabled: await settingValue(tx, "wallet.enabled"),
          deliveryFee: await settingValue(tx, "delivery.fee"),
          zones: (await gasCatalogue(tx)).locations.map((l: any) => l.name),
          windows: String(await settingValue(tx, "delivery.windows"))
            .split(",")
            .map((s) => s.trim()),
          orderingEnabled: await settingValue(tx, "delivery.enabled"),
          codEnabled: await settingValue(tx, "payment.cod"),
          hours: await settingValue(tx, "business.hours"),
        };
      }
      if (
        action === "register" ||
        action === "login" ||
        action === "driver.login" ||
        action === "technician.login"
      ) {
        const data =
          action === "register"
            ? credentials
                .extend({ name: z.string().trim().min(2).max(100) })
                .strict()
                .parse(input)
            : credentials.parse(input);
        const key = digest(`auth:${data.email}`);
        const attempts = await one(
          tx,
          "SELECT * FROM auth_attempts WHERE key=$1 FOR UPDATE",
          [key],
        );
        if (
          attempts &&
          new Date(attempts.reset_at) > new Date() &&
          attempts.attempts >= 8
        )
          return {
            authError: "Too many attempts. Please try again in 15 minutes.",
            status: 429,
          };
        const existing = await one(tx, "SELECT * FROM users WHERE email=$1", [
          data.email,
        ]);
        if (action === "register") {
          if (existing)
            return {
              authError:
                "This email cannot be registered. Try signing in instead.",
              status: 409,
            };
          const userId = id();
          await tx.query(
            "INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,$2,$3,$4,'customer')",
            [
              userId,
              "name" in data ? data.name : "Customer",
              data.email,
              hashPassword(data.password),
            ],
          );
          const session = await issueSession(tx, userId);
          await audit(tx, null, "account.registered", userId);
          return { token: session, role: "customer" };
        }
        // Equal-cost password hashing for unknown emails reduces account enumeration by timing.
        const valid = passwordMatches(
          data.password,
          existing?.password_hash ?? absentAccountHash,
        );
        if (
          !existing ||
          !valid ||
          !existing.active ||
          (action === "driver.login" && existing.role !== "driver") ||
          (action === "technician.login" && existing.role !== "technician")
        ) {
          await tx.query(
            "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.reset_at END",
            [key],
          );
          await audit(tx, null, "auth.failed", key, "denied");
          return { authError: "Email or password is incorrect.", status: 401 };
        }
        await tx.query("DELETE FROM auth_attempts WHERE key=$1", [key]);
        if (token)
          await tx.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [
            digest(token),
          ]);
        const session = await issueSession(tx, existing.id);
        if (action === "driver.login")
          await tx.query(
            "UPDATE sessions SET driver_delivery_only=true WHERE id=$1",
            [digest(session)],
          );
        if (action === "technician.login")
          await tx.query(
            "UPDATE sessions SET technician_service_only=true WHERE id=$1",
            [digest(session)],
          );
        await audit(tx, null, "auth.signed_in", existing.id);
        return { token: session, role: existing.role };
      }
      user = await actor(tx, token);
      driverSessionPermission(user, action, input);

      technicianSessionPermission(user, action, input);
      if (action.startsWith("bulk.")) {
        if (
          action !== "bulk.summary" &&
          process.env.NODE_ENV === "production" &&
          process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true"
        )
          throw new AppError(
            503,
            "Field operations require operational release approval.",
          );
        return action === "bulk.summary"
          ? bulkLPG(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              bulkLPG(tx, user!, action, clean),
            );
      }
      if (
        [
          "inventory.workspace",
          "inventory.movements",
          "inventory.export",
        ].includes(action)
      )
        return inventoryWorkspace(tx, user, action, input);
      if (["dispatch.centre", "dispatch.candidates"].includes(action)) return dispatchCentre(tx,user,action,input);
      if (action === "admin.dashboard") return adminDashboard(tx, user, input);
      if (action === "admin.search") return adminSearch(tx, user, input);
      if (action === "technician.jobs") return technicianJobs(tx, user, input);
      if (action === "technician.availability")
        return requiredBusinessOperation(tx, user, action, input, (clean) =>
          professionalServiceAction(tx, action, user, clean),
        );
      if (action.startsWith("driver."))
        return [
          "driver.snapshot",
          "driver.heartbeat",
          "driver.restrict",
          "driver.location",
        ].includes(action)
          ? driverWorkspace(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              driverWorkspace(tx, user!, action, clean),
            );
      if (
        process.env.NODE_ENV === "production" &&
        process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true" &&
        [
          "trip.start",
          "trip.end",
          "trip.sync",
          "dispatch.assign",
          "dispatch.reassign",
          "dispatch.respond",
          "fleet.vehicle.create",
          "doorstep.propose",
          "doorstep.gas.propose",
          "doorstep.consent",
        ].includes(action)
      )
        throw new AppError(
          503,
          "Field operations require operational release approval. Read-only history remains available.",
        );
      if (
        ["dispatch.assign", "dispatch.reassign"].includes(action) &&
        (process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "false" ||
          (process.env.NODE_ENV === "production" && process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "true"))
      )
        throw new AppError(503, "Tracking fulfilment writes are disabled.");

      if (action === "delivery.photos")
        return deliveryPhotoHistory(tx, user, input);
      if (["fleet.", "trip.", "dispatch."].some((p) => action.startsWith(p)))
        return ["fleet.summary", "dispatch.board"].includes(action)
          ? driverOperations(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              driverOperations(tx, user!, action, clean),
            );
      if (action.startsWith("manifest."))
        return action === "manifest.summary"
          ? vehicleProducts(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              vehicleProducts(tx, user!, action, clean),
            );
      if (action.startsWith("crm."))
        return ["crm.summary", "crm.followups"].includes(action)
          ? winbackCRM(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              winbackCRM(tx, user!, action, clean),
            );
      if (action === "doorstep.products.propose")
        return requiredBusinessOperation(tx, user, action, input, (clean) => {
          const d = z
            .object({
              orderId: z.string().uuid(),
              version: z.number().int().nonnegative(),
              items: z
                .array(
                  z
                    .object({
                      productId: z.string().min(1).max(100),
                      quantity: z.number().int().positive().max(20),
                    })
                    .strict(),
                )
                .min(1)
                .max(20),
            })
            .strict()
            .parse(clean);
          return doorstepAmendments(tx, user!, "doorstep.propose", {
            ...d,
            lines: [],
          });
        });
      if (action === "doorstep.gas.propose") {
        return requiredBusinessOperation(tx, user, action, input, (clean) => {
          const d = z
            .object({
              orderId: z.string().uuid(),
              version: z.number().int().nonnegative(),
              capacityKg: z.number().positive().optional(),
              kg: z.number().positive().optional(),
              lines: z
                .array(
                  z
                    .object({
                      capacityKg: z.number().positive(),
                      kg: z.number().positive(),
                    })
                    .strict(),
                )
                .min(1)
                .max(10)
                .optional(),
            })
            .strict()
            .refine(
              (d) =>
                d.lines
                  ? d.capacityKg === undefined && d.kg === undefined
                  : d.capacityKg !== undefined && d.kg !== undefined,
              "Choose cylinder lines or one legacy cylinder, not both",
            )
            .parse(clean);
          return doorstepAmendments(tx, user!, "doorstep.propose", {
            orderId: d.orderId,
            version: d.version,
            lines: d.lines ?? [{ capacityKg: d.capacityKg!, kg: d.kg! }],
          });
        });
      }
      if (action.startsWith("doorstep."))
        return action === "doorstep.list"
          ? doorstepAmendments(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              doorstepAmendments(tx, user!, action, clean),
            );
      if (action.startsWith("phone."))
        return requiredBusinessOperation(tx, user, action, input, (clean) =>
          phoneActivation(tx, user, action, clean),
        );
      if (action.startsWith("channels."))
        return ["channels.status", "channels.preferences"].includes(action)
          ? channelAction(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              channelAction(tx, user!, action, clean),
            );
      if (
        action.startsWith("testimonial.") ||
        action.startsWith("testimonials.")
      )
        return testimonialAction(tx, action, user, input);
      if (action === "booking.recover") {
        allow(user, ["customer", "commercial"]);
        const d = z.object({ key: z.string().uuid() }).strict().parse(input);
        const saved = await one(
          tx,
          "SELECT id,reference FROM service_bookings WHERE customer_id=$1 AND idempotency_key=$2",
          [user.id, d.key],
        );
        return saved
          ? { status: "COMMITTED", ...saved }
          : { status: "NOT_FOUND" };
      }
      if (action === "booking.operation")
        return operationOutcome(tx, user, input);
      if (
        (action.startsWith("booking.") ||
          action.startsWith("service.material.")) &&
        (input as any)?.operationKey
      )
        return businessOperation(tx, user, action, input, (clean) =>
          professionalServiceAction(tx, action, user, clean),
        );
      if (
        [
          "customers.manage",
          "customers.detail",
          "customers.create",
          "customers.update",
        ].includes(action)
      )
        return customerManagement(tx, user, action, input);
      if (
        [
          "customers.lookup",
          "customers.provisional",
          "order.assisted.create",
          "order.assisted.quote",
        ].includes(action)
      )
        return assistedOrdering(tx, user, action, input);
      if (
        [
          "invoice.service",
          "invoice.service.draft",
          "invoice.service.draft.save",
          "invoice.service.issue",
        ].includes(action)
      )
        return action === "invoice.service.draft.save"
          ? requiredBusinessOperation(tx, user, action, input, (clean) =>
              serviceInvoiceAction(tx, user!, action, clean),
            )
          : serviceInvoiceAction(tx, user, action, input);
      if (
        action.startsWith("invoice.") &&
        !["invoice.order", "invoice.issue"].includes(action)
      )
        return ["invoice.corrections", "invoice.request.view"].includes(action)
          ? invoiceCorrections(tx, user, action, input)
          : requiredBusinessOperation(tx, user, action, input, (clean) =>
              invoiceCorrections(tx, user!, action, clean),
            );
      if (["invoice.order", "invoice.issue"].includes(action))
        return invoiceAction(tx, user, action, input);
      if (action === "customer.dashboard")
        return customerDashboard(tx, user, input);
      if (action === "navigation.access") return navigationAccess(tx, user);
      if (action === "navigation") return navigationSnapshot(tx, user, input);
      if (["account.password", "reauth"].includes(action)) {
        const lock = await one(
          tx,
          "SELECT attempts FROM auth_attempts WHERE key=$1 AND reset_at>now()",
          [digest(`reauth:${user.id}`)],
        );
        if (lock && lock.attempts >= 5)
          throw new AppError(
            429,
            "Too many verification attempts. Try again in 15 minutes.",
          );
      }
      if (action === "production.readiness") return readiness(tx, user);
      const inventoryResult = await inventoryBusiness(tx, action, user, input);
      if (inventoryResult !== undefined) return inventoryResult;
      const businessResult = await businessReporting(tx, action, user, input);
      if (businessResult !== undefined) return businessResult;
      const staffResult = await staffAction(tx, action, user, input);
      if (staffResult !== undefined) return staffResult;
      const bundleResult = await bundleAction(tx, action, user, input);
      if (bundleResult !== undefined) return bundleResult;
      const followupResult = await followupAction(tx, action, user, input);
      if (followupResult !== undefined) return followupResult;
      const policyResult = await policyAction(tx, action, user, input);
      if (policyResult !== undefined) return policyResult;
      const workflow = await approvalWorkflowAction(tx, action, user, input);
      if (workflow !== undefined) return workflow;
      const gas = await gasDeliveryAction(tx, action, user, input);
      if (gas !== undefined) return gas;
      const reportResult = await financialReports(tx, action, user, input);
      if (reportResult !== undefined) return reportResult;
      const mixedResult = await mixedCheckoutAction(tx, action, user, input);
      if (mixedResult !== undefined) return mixedResult;
      const catalogueResult = await catalogueAction(tx, action, user, input);
      if (catalogueResult !== undefined) return catalogueResult;
      const professionalResult = await professionalServiceAction(
        tx,
        action,
        user,
        input,
      );
      if (professionalResult !== undefined) return professionalResult;
      const mailResult = await mailAction(tx, action, user, input);
      if (mailResult !== undefined) return mailResult;
      const accountResult = await accountAction(tx, action, user, input);
      if (accountResult !== undefined) return accountResult;
      const delegationResult = await delegationAction(tx, action, user, input);
      if (delegationResult !== undefined) return delegationResult;
      const schedulingResult = await schedulingAction(tx, action, user, input);
      if (schedulingResult !== undefined) return schedulingResult;
      const offerResult = await rewardOfferAction(tx, action, user, input);
      if (offerResult !== undefined) return offerResult;
      const referralResult = await referralAction(tx, action, user, input);
      if (referralResult !== undefined) return referralResult;
      const rewardsResult = await rewardsAction(tx, action, user, input);
      if (rewardsResult !== undefined) return rewardsResult;
      if (action === "documents.list") return financialDocuments(tx, user, input);
      const fundingResult = await walletFundingAction(tx, action, user, input);
      if (fundingResult !== undefined) return fundingResult;
      const commerceResult = await commerceAction(tx, action, user, input);
      if (commerceResult !== undefined) return commerceResult;
      const refillResult = await refillAction(tx, action, user, input);
      if (refillResult !== undefined) return refillResult;
      const workspaceResult = await workspaceAction(tx, action, user, input);
      if (workspaceResult !== undefined) return workspaceResult;
      if (action === "products.manage") {
        allow(user, [
          "owner",
          "manager",
          "sales",
          "inventory",
          "technician",
          "service_manager",
          "safety_officer",
        ]);
        const selection = z
          .object({ branchId: z.string().min(1).max(100).optional() })
          .strict()
          .parse(input);
        const catalogueBranch = selection.branchId ?? user.branch_id ?? "lagos";
        allow(
          user,
          [
            "owner",
            "manager",
            "sales",
            "inventory",
            "technician",
            "service_manager",
            "safety_officer",
          ],
          catalogueBranch,
        );
        return {
          branches: (
            await tx.query(
              `SELECT id,name FROM branches WHERE active=true AND ${user.role === "owner" ? "true" : "id=$1"} ORDER BY name`,
              user.role === "owner" ? [] : [user.branch_id],
            )
          ).rows,
          categories: (
            await tx.query(
              "SELECT name FROM product_categories WHERE active=true ORDER BY name",
            )
          ).rows.map((r) => r.name),
          products: (
            await tx.query(
              "SELECT p.*,(SELECT m.id FROM media_assets m WHERE m.product_id=p.id AND m.archived=false ORDER BY m.position,m.created_at LIMIT 1) AS image_id,i.price_kobo,i.published,i.quantity-i.reserved AS available FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.branch_id=$1 ORDER BY p.size_kg NULLS LAST,p.name",
              [catalogueBranch],
            )
          ).rows,
        };
      }
      if (action === "me")
        return {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branchId: user.branch_id,
          },
          notifications: (
            await tx.query(
              "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30",
              [user.id],
            )
          ).rows,
        };
      if (action === "logout") {
        await tx.query("UPDATE sessions SET revoked_at=now() WHERE id=$1", [
          user.session_id,
        ]);
        return { ok: true };
      }
      if (action === "reauth") {
        const attempts = await one(
          tx,
          "SELECT attempts,reset_at FROM auth_attempts WHERE key=$1",
          [digest(`reauth:${user.id}`)],
        );
        if (
          attempts &&
          new Date(attempts.reset_at).getTime() > Date.now() &&
          attempts.attempts >= 5
        )
          throw new AppError(
            429,
            "Too many verification attempts. Try again in 15 minutes.",
          );
        const data = z
          .object({ password: z.string().max(128) })
          .strict()
          .parse(input);
        const record = await one(
          tx,
          "SELECT password_hash FROM users WHERE id=$1",
          [user.id],
        );
        if (!passwordMatches(data.password, record!.password_hash))
          throw new AppError(
            403,
            "Password verification failed.",
            "REAUTH_INVALID",
          );
        await tx.query("DELETE FROM auth_attempts WHERE key=$1", [
          digest(`reauth:${user.id}`),
        ]);
        await tx.query("UPDATE sessions SET verified_at=now() WHERE id=$1", [
          user.session_id,
        ]);
        await audit(tx, user, "auth.reverified", user.id);
        return { ok: true };
      }
      if (action === "checkout") {
        const order = await checkout(tx, user, checkoutSchema.parse(input));
        order!.gas_lines = (
          await tx.query("SELECT * FROM order_gas_lines WHERE order_id=$1", [
            order!.id,
          ])
        ).rows;
        delete order!.delivery_code_hash;
        delete order!.delivery_code_expires_at;
        return order;
      }
      if (action === "orders") {
        const staff = !["customer", "commercial"].includes(user.role);
        if (staff)
          allow(user, [
            "owner",
            "manager",
            "sales",
            "dispatcher",
            "driver",
            "finance",
          ]);
        let filter = staff
          ? user.role === "owner"
            ? "true"
            : user.role === "driver"
              ? "o.driver_id=$1 AND o.branch_id=$2"
              : "o.branch_id=$1"
          : "o.customer_id=$1";
        const params: any[] =
          staff && user.role === "owner"
            ? []
            : [staff && user.role !== "driver" ? user.branch_id : user.id];
        if (user.role === "driver") params.push(user.branch_id);
        if ((input as any)?.id) {
          const oid = z
            .string()
            .uuid()
            .parse((input as any).id);
          params.push(oid);
          filter += ` AND o.id=$${params.length}`;
        }
        const orders = (
          await tx.query(
            `SELECT o.*,u.name AS customer_name FROM orders o JOIN users u ON u.id=o.customer_id WHERE ${filter} ORDER BY o.created_at DESC LIMIT 100`,
            params,
          )
        ).rows;
        for (const o of orders) {
          if (
            !staff &&
            !["delivered", "cancelled"].includes(o.status) &&
            o.delivery_code_expires_at &&
            new Date(o.delivery_code_expires_at).getTime() > Date.now()
          ) {
            const code = await one(
              tx,
              "SELECT body FROM notifications WHERE user_id=$1 AND related_id=$2 AND title='Delivery confirmation code' ORDER BY created_at DESC LIMIT 1",
              [user.id, o.id],
            );
            o.confirmation_code = code?.body.match(/\b\d{6}\b/)?.[0];
          }
          o.gas_lines = (
            await tx.query("SELECT * FROM order_gas_lines WHERE order_id=$1", [
              o.id,
            ])
          ).rows;
          o.attempt = await one(
            tx,
            "SELECT id,state,driver_id,assignment_version,picked_up_at,arrived_at,completed_at FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1",
            [o.id],
          );
          o.driver = o.driver_id
            ? await one(tx, "SELECT name FROM users WHERE id=$1", [o.driver_id])
            : null;
          o.last_update =
            (
              await one(
                tx,
                "SELECT max(created_at) at FROM order_events WHERE order_id=$1",
                [o.id],
              )
            )?.at ?? o.created_at;
          o.gps = { enabled: false, status: "unavailable", eta: null };
          if (staff) {
            o.manifest = await deliveryManifest(tx, o.id);
            o.delivery_evidence = o.attempt
              ? (
                  await tx.query(
                    "SELECT kind,detail,created_at FROM delivery_evidence WHERE attempt_id=$1 ORDER BY created_at",
                    [o.attempt.id],
                  )
                ).rows
              : [];
          }
          delete o.delivery_code_hash;
          delete o.delivery_code_expires_at;
          o.items = (
            await tx.query("SELECT * FROM order_items WHERE order_id=$1", [
              o.id,
            ])
          ).rows;
          o.events = (
            await tx.query(
              "SELECT status,note,created_at,version,previous_status FROM order_events WHERE order_id=$1 ORDER BY created_at",
              [o.id],
            )
          ).rows;
        }
        return orders;
      }
      if (action === "tracking.drivers") {
        allow(user, ["owner", "manager", "dispatcher"]);
        return (
          await tx.query(
            `SELECT u.id,u.name,u.branch_id,u.active,u.role,(SELECT count(*) FROM orders o WHERE o.driver_id=u.id AND o.status IN ('assigned','out_for_delivery')) AS active_stops FROM users u WHERE u.role='driver' AND u.active=true AND (${user.role === "owner" ? "true" : "u.branch_id=$1"}) ORDER BY u.name`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "tracking.operation")
        return operationOutcome(tx, user, input);
      if (
        [
          "order.transition",
          "delivery.complete",
          "delivery.pickup",
          "delivery.arrived",
          "delivery.return",
          "delivery.reschedule",
          "delivery.help",
        ].includes(action)
      ) {
        if (
          process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "false" ||
          (process.env.NODE_ENV === "production" &&
            process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "true")
        )
          throw new AppError(
            503,
            "Tracking fulfilment writes are disabled pending operational release approval. Tracking history remains available.",
          );
        return businessOperation(tx, user, action, input, async (clean) => {
          if (action === "order.transition")
            return transitionOrder(
              tx,
              user!,
              z
                .object({
                  id: z.string().uuid(),
                  status: z.string(),
                  note: z.string().min(5).max(500),
                  driverId: z.string().uuid().optional(),
                  failureReason: z.enum(deliveryFailureReasons).optional(),
                  version: z.number().int().nonnegative().optional(),
                })
                .strict()
                .parse(clean),
            );
          if (action === "delivery.complete")
            return completeDelivery(
              tx,
              user!,
              z
                .object({
                  orderId: z.string().uuid(),
                  code: z.string().regex(/^\d{6}$/),
                  collectedKobo: z.number().int().min(0),
                  version: z.number().int().nonnegative().optional(),
                  handover: z.boolean().optional(),
                })
                .strict()
                .parse(clean),
            );
          return trackingAction(tx, user!, action, clean);
        });
      }
      if (action === "cash.collections") {
        allow(user, ["owner", "finance"]);
        return (
          await tx.query(
            `SELECT c.id,c.amount_kobo,c.created_at,c.verified_at,o.reference,o.branch_id,u.name AS collector FROM cash_collections c JOIN orders o ON o.id=c.order_id JOIN users u ON u.id=c.collector_id WHERE ${user.role === "owner" ? "true" : "o.branch_id=$1"} ORDER BY c.created_at DESC`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "cash.reconcile") {
        const d = z.object({ id: z.string().uuid() }).strict().parse(input);
        return reconcileCash(tx, user, d.id);
      }
      if (action === "wallet")
        return {
          rewardsInfo: ["customer", "commercial"].includes(user.role)
            ? await rewardsAction(tx, "rewards.summary", user, {})
            : null,
          rewardEntries: (
            await tx.query(
              "SELECT e.id,e.points,e.created_at,d.kind FROM reward_entries e LEFT JOIN reward_entry_details d ON d.entry_id=e.id WHERE e.customer_id=$1 ORDER BY e.created_at DESC,e.id DESC LIMIT 200",
              [user.id],
            )
          ).rows,
          balanceKobo: Number(
            (
              await one(
                tx,
                "SELECT COALESCE(sum(amount_kobo),0) AS balance FROM wallet_entries WHERE customer_id=$1",
                [user.id],
              )
            )?.balance ?? 0,
          ),
          entries: (
            await tx.query(
              "SELECT * FROM wallet_entries WHERE customer_id=$1 ORDER BY created_at DESC",
              [user.id],
            )
          ).rows,
          points: Number(
            (
              await one(
                tx,
                "SELECT COALESCE(sum(points),0) AS points FROM reward_entries WHERE customer_id=$1",
                [user.id],
              )
            )?.points ?? 0,
          ),
        };
      if (action === "schedules")
        return (
          await tx.query(
            "SELECT s.*,p.name AS product_name FROM refill_schedules s JOIN products p ON p.id=s.product_id WHERE customer_id=$1 ORDER BY next_date",
            [user.id],
          )
        ).rows;
      if (action === "schedule.create") {
        const d = z
          .object({
            productId: z.string(),
            intervalDays: z.union([
              z.literal(7),
              z.literal(14),
              z.literal(28),
              z.literal(42),
            ]),
            nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          })
          .strict()
          .parse(input);
        const p = await one(
          tx,
          "SELECT p.id FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.id=$1 AND i.published=true AND i.branch_id='lagos' AND p.category='Gas refills'",
          [d.productId],
        );
        if (!p) throw new AppError(400, "Choose an available refill product.");
        if (
          Date.parse(d.nextDate) < Date.now() ||
          Date.parse(d.nextDate) > Date.now() + 365 * 86400000
        )
          throw new AppError(400, "Choose a future date within the next year.");
        const scheduleId = id();
        await tx.query(
          "INSERT INTO refill_schedules(id,customer_id,product_id,interval_days,next_date) VALUES ($1,$2,$3,$4,$5)",
          [scheduleId, user.id, d.productId, d.intervalDays, d.nextDate],
        );
        return { id: scheduleId };
      }
      if (action === "schedule.update") {
        const d = z
          .object({
            id: z.string().uuid(),
            status: z.enum(["active", "paused", "cancelled"]),
          })
          .strict()
          .parse(input);
        const row = await one(
          tx,
          "UPDATE refill_schedules SET status=$1 WHERE id=$2 AND customer_id=$3 RETURNING id",
          [d.status, d.id, user.id],
        );
        if (!row) throw new AppError(404, "Schedule not found.");
        return { ok: true };
      }
      if (action === "support.create") {
        const d = z
          .object({
            orderId: z.string().uuid().optional(),
            subject: z.string().min(5).max(100),
            message: z.string().min(10).max(2000),
          })
          .strict()
          .parse(input);
        let branch = user.branch_id ?? "lagos";
        if (d.orderId) {
          const order = await one(
            tx,
            "SELECT branch_id FROM orders WHERE id=$1 AND customer_id=$2",
            [d.orderId, user.id],
          );
          if (!order)
            throw new AppError(404, "Order unavailable for this account.");
          branch = order.branch_id;
        }
        await tx.query(
          "INSERT INTO support_requests(id,customer_id,subject,message,branch_id,order_id) VALUES($1,$2,$3,$4,$5,$6)",
          [id(), user.id, d.subject, d.message, branch, d.orderId ?? null],
        );
        return { ok: true };
      }
      if (action === "settings") {
        const d = z.object({ scope: scopeSchema }).strict().parse(input);
        allow(
          user,
          [
            "owner",
            "manager",
            "sales",
            "inventory",
            "dispatcher",
            "finance",
            "administrator",
            "service_manager",
            "safety_officer",
            "service_manager",
            "safety_officer",
          ],
          d.scope,
        );
        return (
          await tx.query(
            "SELECT d.*,s.value,s.version,s.scope,s.changed_at FROM setting_definitions d JOIN settings s ON s.key=d.key WHERE s.scope=$1 ORDER BY d.category,d.label",
            [d.scope],
          )
        ).rows.filter(
          (d) =>
            d.view_roles.includes(user!.role) &&
            d.value_type !== "inventory_operation",
        );
      }
      if (action === "setting.propose")
        return propose(
          tx,
          user,
          z
            .object({
              key: z.string(),
              scope: scopeSchema,
              value: z.unknown(),
              version: z.number().int(),
              reason: z.string().max(1000),
              effectiveAt: z.iso.datetime().optional(),
              rollbackOf: z.string().uuid().optional(),
              draft: z.boolean().optional(),
            })
            .strict()
            .parse(input) as any,
        );
      if (action === "setting.history") {
        const d = z
          .object({ key: z.string(), scope: scopeSchema })
          .strict()
          .parse(input);
        await definition(tx, user, d.key, d.scope, "view");
        return (
          await tx.query(
            "SELECT * FROM setting_versions WHERE key=$1 AND scope=$2 ORDER BY version DESC",
            [d.key, d.scope],
          )
        ).rows;
      }
      if (action === "setting.rollback") {
        const d = z
          .object({
            versionId: z
              .string()
              .min(1)
              .max(100)
              .regex(/^[A-Za-z0-9-]+$/),
            reason: z.string().min(5).max(1000),
          })
          .strict()
          .parse(input);
        const version = await one(
          tx,
          "SELECT * FROM setting_versions WHERE id=$1",
          [d.versionId],
        );
        if (!version) throw new AppError(404, "Version not found.");
        await definition(tx, user, version.key, version.scope, "propose");
        const current = await one(
          tx,
          "SELECT version FROM settings WHERE key=$1 AND scope=$2",
          [version.key, version.scope],
        );
        return propose(tx, user, {
          key: version.key,
          scope: version.scope,
          value: version.previous_value,
          version: current!.version,
          reason: d.reason,
          rollbackOf: version.id,
        });
      }
      if (action === "approvals") {
        allow(user, [
          "owner",
          "manager",
          "sales",
          "inventory",
          "dispatcher",
          "finance",
          "administrator",
          "service_manager",
          "safety_officer",
        ]);
        const rows = (
          await tx.query(
            "SELECT r.*,d.label,d.description,d.value_type,d.minimum,d.maximum,d.category,d.approve_roles,d.view_roles,d.required_roles,u.name AS requester FROM change_requests r JOIN setting_definitions d ON d.key=r.key JOIN users u ON u.id=r.requester_id WHERE ($1::text IS NULL OR r.scope=$1) AND d.view_roles @> $2::jsonb ORDER BY r.created_at DESC LIMIT 200",
            [
              user.role === "owner" ? null : user.branch_id,
              JSON.stringify([user.role]),
            ],
          )
        ).rows;
        const permitted = rows.filter(
          (r) =>
            (user!.role === "owner" || r.scope === user!.branch_id) &&
            r.view_roles.includes(user!.role),
        );
        for (const r of permitted) {
          if (r.value_type === "inventory_operation") {
            const operation = await one(
              tx,
              "SELECT kind,reference,payload,applied_at FROM inventory_operations WHERE request_id=$1",
              [r.id],
            );
            r.business_operation = operation;
          }
          const d = await one(
            tx,
            "SELECT * FROM setting_definitions WHERE key=$1",
            [r.key],
          );
          r.can_approve =
            r.requester_id !== user!.id &&
            ["pending_approval", "partially_approved"].includes(r.status) &&
            new Date(r.expires_at).getTime() > Date.now() &&
            (r.approve_roles.includes(user!.role) ||
              Boolean(d && (await delegatedAuthority(tx, user!.id, d, r)))) &&
            !(
              d?.value_type === "access" &&
              r.proposed_value?.userId === user!.id
            );
          r.state = r.status.toUpperCase();
          r.decisions = (
            await tx.query(
              "SELECT a.approver_id,a.revision,a.decision,a.reason,a.created_at,u.name AS approver FROM approval_decisions a JOIN users u ON u.id=a.approver_id WHERE request_id=$1 ORDER BY a.created_at",
              [r.id],
            )
          ).rows;
          if (
            r.decisions.some(
              (a: any) =>
                a.approver_id === user!.id && a.revision === r.revision,
            )
          )
            r.can_approve = false;
          if (
            d?.value_type === "checklist" &&
            user.role === "safety_officer" &&
            !(await one(
              tx,
              "SELECT q.id FROM technician_qualifications q JOIN users u ON u.id=q.verified_by WHERE q.user_id=$1 AND q.code='safety_review' AND q.expires_at>now() AND u.active=true AND u.role IN ('owner','safety_officer')",
              [user.id],
            ))
          )
            r.can_approve = false;
        }
        return permitted;
      }
      if (action === "approval.decide") {
        const d = z
          .object({
            id: z.string().uuid(),
            decision: z.enum(["approve", "reject", "request_changes"]),
            reason: z.string().max(1000),
          })
          .strict()
          .parse(input);
        return decide(tx, user, d.id, d.decision, d.reason);
      }
      if (action === "approval.activate") {
        const d = z.object({ id: z.string().uuid() }).strict().parse(input);
        const r = await one(
          tx,
          "SELECT key,scope FROM change_requests WHERE id=$1",
          [d.id],
        );
        if (!r) throw new AppError(404, "Request not found.");
        await definition(tx, user, r.key, r.scope, "approve");
        const result = await activate(tx, user, d.id);
        return {
          ok: result?.status === "active" || result?.status === "scheduled",
          ...result,
        };
      }
      if (action === "emergency.disable") {
        const d = z
          .object({
            key: z.string(),
            scope: scopeSchema,
            reason: z.string().max(1000),
          })
          .strict()
          .parse(input);
        return emergencyDisable(tx, user, d.key, d.scope, d.reason);
      }
      if (action === "inventory") {
        allow(user, ["owner", "manager", "inventory", "sales"]);
        return (
          await tx.query(
            `SELECT i.*,p.name,p.asset FROM inventory i JOIN products p ON p.id=i.product_id WHERE ${user.role === "owner" ? "true" : "i.branch_id=$1"} ORDER BY p.name`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "inventory.receive")
        return receiveStock(
          tx,
          user,
          z
            .object({
              productId: z.string(),
              quantity: z.number().int().min(1).max(100000),
              reason: z.string().min(5).max(500),
              reference: z.string().min(5).max(100),
              branchId: scopeSchema,
            })
            .strict()
            .parse(input),
        );
      if (action === "audit") {
        allow(user, ["owner", "administrator"]);
        return (
          await tx.query(
            "SELECT a.*,u.name AS actor FROM audit_events a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.created_at DESC LIMIT 200",
          )
        ).rows;
      }
      if (action === "customers") {
        allow(user, ["owner", "manager"]);
        return (
          await tx.query(
            `SELECT u.id,u.name,u.email,u.created_at,count(o.id)::int AS orders FROM users u LEFT JOIN orders o ON o.customer_id=u.id WHERE u.role IN ('customer','commercial') AND ${user.role === "owner" ? "true" : "o.branch_id=$1"} GROUP BY u.id ORDER BY u.created_at DESC LIMIT 100`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "staff") {
        allow(user, ["owner", "manager", "dispatcher"]);
        return (
          await tx.query(
            `SELECT id,name,email,role,branch_id,active FROM users WHERE role NOT IN ('customer','commercial') AND ${user.role === "owner" ? "true" : "branch_id=$1"} ORDER BY name`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "cylinders") {
        allow(user, ["owner", "manager", "inventory"]);
        return (
          await tx.query(
            `SELECT * FROM cylinders WHERE ${user.role === "owner" ? "true" : "branch_id=$1"} ORDER BY created_at DESC`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
      }
      if (action === "cylinder.create") {
        const d = z
          .object({
            serial: z.string().min(4).max(80),
            sizeKg: z.number().positive().max(100),
            ownership: z.enum(["company", "supplier"]),
            status: z.enum([
              "filled",
              "empty",
              "damaged",
              "quarantined",
              "inspection_due",
            ]),
            testDue: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            branchId: scopeSchema,
          })
          .strict()
          .parse(input);
        allow(user, ["owner", "manager", "inventory"], d.branchId);
        if (Date.parse(d.testDue) < Date.now() && d.status === "filled")
          throw new AppError(
            400,
            "An overdue cylinder cannot be recorded as ready for use.",
          );
        const cylinderId = id();
        await tx.query(
          "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [
            cylinderId,
            d.branchId,
            d.serial,
            d.sizeKg,
            d.ownership,
            d.status,
            d.testDue,
          ],
        );
        await tx.query(
          "INSERT INTO cylinder_events(id,cylinder_id,actor_id,status,reason) VALUES ($1,$2,$3,$4,$5)",
          [
            id(),
            cylinderId,
            user.id,
            d.status,
            "Initial cylinder registration",
          ],
        );
        await audit(tx, user, "cylinder.registered", cylinderId);
        return { ok: true };
      }
      if (action === "finance" || action === "finance.export") {
        if (action === "finance.export") z.object({}).strict().parse(input);
        allow(user, ["owner", "finance"], user.branch_id ?? undefined);
        const rows = (
          await tx.query(
            `SELECT reference,total_kobo,payment_method,payment_status,status,created_at FROM orders WHERE ${user.role === "owner" ? "true" : "branch_id=$1"} UNION ALL SELECT p.reference,p.total_kobo,'pos_cash' AS payment_method,CASE WHEN s.status='verified' THEN 'verified' ELSE 'collected' END AS payment_status,'pos_sale' AS status,p.created_at FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE ${user.role === "owner" ? "true" : "s.branch_id=$1"} ORDER BY created_at DESC LIMIT 500`,
            user.role === "owner" ? [] : [user.branch_id],
          )
        ).rows;
        await audit(
          tx,
          user,
          action === "finance.export"
            ? "finance.exported"
            : "finance.report_viewed",
          "orders",
        );
        return rows;
      }
      if (action === "dashboard") {
        allow(user, [
          "owner",
          "manager",
          "sales",
          "inventory",
          "dispatcher",
          "finance",
          "administrator",
          "service_manager",
          "safety_officer",
        ]);
        const global = user.role === "owner";
        const orders = (
          await tx.query(
            `SELECT id,status,total_kobo,payment_status,created_at FROM orders WHERE ${global ? "true" : "branch_id=$1"}`,
            global ? [] : [user.branch_id],
          )
        ).rows;
        return {
          orders: orders.length,
          revenueKobo: !["owner", "manager", "finance"].includes(user.role)
            ? null
            : orders
                .filter(
                  (o) =>
                    o.payment_status === "verified" && o.status === "delivered",
                )
                .reduce((sum, o) => sum + Number(o.total_kobo), 0) +
              Number(
                (await one(
                  tx,
                  `SELECT COALESCE(sum(p.total_kobo),0) AS n FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE s.status='verified' AND ${global ? "true" : "s.branch_id=$1"}`,
                  global ? [] : [user.branch_id],
                ))!.n,
              ),
          pending: orders.filter(
            (o) => !["delivered", "cancelled"].includes(o.status),
          ).length,
          customers: global
            ? Number(
                (
                  await one(
                    tx,
                    "SELECT count(*) AS n FROM users WHERE role IN ('customer','commercial')",
                  )
                )?.n,
              )
            : new Set(
                (
                  await tx.query(
                    "SELECT customer_id FROM orders WHERE branch_id=$1",
                    [user.branch_id],
                  )
                ).rows.map((o) => o.customer_id),
              ).size,
          inventory: (
            await tx.query(
              `SELECT COALESCE(sum(quantity-reserved),0) AS n FROM inventory WHERE ${global ? "true" : "branch_id=$1"}`,
              global ? [] : [user.branch_id],
            )
          ).rows[0].n,
        };
      }
      throw new AppError(404, "This operation is not available.");
    });
  } catch (error) {
    if (!(error instanceof AppError) && !(error instanceof z.ZodError))
      await recordFailure(
        db,
        "operation_failure",
        action + ":" + new Date().toISOString().slice(0, 13),
        error instanceof Error ? error.name : "unknown",
        (user as Actor | null)?.branch_id ?? null,
      );
    if (error instanceof AppError && error.code === "REAUTH_INVALID" && user) {
      await db.query(
        "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.reset_at END",
        [digest(`reauth:${(user as Actor).id}`)],
      );
    }
    if (
      error instanceof AppError &&
      error.status === 409 &&
      user &&
      /^(inventory\.|transfer\.|expense\.|purchase\.)/.test(action)
    )
      await audit(db, user, "security.business_conflict", action, "denied", {
        code: error.code,
      });
    if (error instanceof z.ZodError && user)
      await audit(db, user, "security.invalid_request", action, "denied");
    if (
      error instanceof AppError &&
      error.code === "DELIVERY_CODE_INVALID" &&
      user
    ) {
      const key = digest(
        `delivery:${(input as any).orderId}:${(user as Actor).id}`,
      );
      await db.query(
        "INSERT INTO auth_attempts(key,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN auth_attempts.reset_at<now() THEN 1 ELSE auth_attempts.attempts+1 END,reset_at=CASE WHEN auth_attempts.reset_at<now() THEN now()+interval '15 minutes' ELSE auth_attempts.reset_at END",
        [key],
      );
      await audit(
        db,
        user,
        "delivery.invalid_code",
        (input as any).orderId,
        "denied",
      );
    }
    if (error instanceof AppError && [401, 403].includes(error.status)) {
      await audit(db, user, "security.denied", action, "denied", {
        code: error.code,
      });
    }
    throw error;
  }
}
