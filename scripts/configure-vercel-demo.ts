// Synthetic client-demo configuration through existing governed business actions.
import { readFile } from "node:fs/promises";
import { createDatabase, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { id } from "../apps/web/lib/auth";
const file = process.env.EASYGAS_DEMO_CREDENTIAL_FILE;
if (
  !file?.startsWith("/tmp/easygas-") ||
  process.env.EASYGAS_DEMO_PROVISION !== "easygas-client-demo-db"
)
  throw Error("Explicit isolated demo required");
const manifest = JSON.parse(await readFile(file, "utf8"));
if (
  manifest.purpose !== "isolated-vercel-client-demo" ||
  manifest.project !== "easygas-client-demo"
)
  throw Error("Wrong demo manifest");
process.env.DATABASE_URL = manifest.runtimeUrl;
process.env.NODE_ENV = "production";
process.env.EASYGAS_BACKGROUND_JOBS = "false";
process.env.APP_URL = "https://easygas-client-demo.vercel.app";
const db = await createDatabase(),
  tokens: Record<string, string> = {};
const call = (role: string, action: string, input: any = {}) =>
  dispatch(action, tokens[role] ?? null, input, db);
try {
  const privilege = await one(
    db,
    "SELECT current_user AS name,rolsuper,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user",
  );
  if (
    privilege?.name !== "easygas_demo_runtime" ||
    privilege.rolsuper ||
    privilege.rolcreaterole ||
    privilege.rolbypassrls
  )
    throw Error("Restricted demo runtime required");
  for (const role of [
    "owner",
    "manager",
    "inventory",
    "finance",
    "service_manager",
    "safety_officer",
  ]) {
    const a = manifest.accounts.find((a: any) => a.role === role);
    const r = await call(role, "login", {
      email: a.email,
      password: a.password,
    });
    tokens[role] = r.token;
    await call(role, "reauth", { password: a.password });
  }
  const reason =
    "Synthetic client demonstration only; not real business inventory or operating authority";
  const uid = async (role: string) =>
    (await one(db, "SELECT id FROM users WHERE email=$1", [
      manifest.accounts.find((a: any) => a.role === role).email,
    ]))!.id;
  for (const [role, code] of [
    ["inventory", "inventory_safety"],
    ["safety_officer", "safety_review"],
    ["technician", "lpg_service"],
  ])
    await call("owner", "technician.qualify", {
      userId: await uid(role),
      code,
      evidence: reason,
      expiresAt: new Date(Date.now() + 90 * 86400000).toISOString(),
    });
  for (const p of (
    await db.query(
      "SELECT p.id FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.category='Empty cylinders' AND i.published=true AND i.branch_id='lagos'",
    )
  ).rows) {
    if (
      !(await one(db, "SELECT id FROM stock_movements WHERE reference=$1", [
        "VERCEL-DEMO-" + p.id,
      ]))
    )
      await call("inventory", "inventory.receipt", {
        branchId: "lagos",
        productId: p.id,
        quantity: 20,
        reference: "VERCEL-DEMO-" + p.id,
        reason,
        evidence: reason,
        receivedDate: new Date().toISOString().slice(0, 10),
        receivingPassed: true,
      });
  }
  if (
    !(await one(
      db,
      "SELECT id FROM gas_stock_movements WHERE reference='VERCEL-DEMO-GAS'",
    ))
  )
    await call("inventory", "gas.stock.receive", {
      branchId: "lagos",
      grams: 1000000,
      reference: "VERCEL-DEMO-GAS",
      reason,
    });
  const setting = async (key: string, value: any, proposer = "manager") => {
    const s = await one(
      db,
      "SELECT value,version FROM settings WHERE key=$1 AND scope=$2",
      [key, "lagos"],
    );
    if (JSON.stringify(s?.value) === JSON.stringify(value)) return;
    const r = await call(proposer, "setting.propose", {
      key,
      scope: "lagos",
      version: s!.version,
      value,
      reason,
    });
    await call("owner", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason,
    });
  };
  await setting("gas.quantity_policy", {
    minimumKg: 0.5,
    maximumKg: 50,
    incrementKg: 0.5,
    precision: 1,
    capacitiesKg: [3, 6, 12.5, 25, 50],
  });
  // Enable only synthetic, unpaid COD ordering. Real payment integrations remain disabled.
  await setting("delivery.enabled", true);
  await setting("payment.cod", true, "finance");
  const services = (
    await db.query(
      "SELECT * FROM service_catalogue WHERE branch_id='lagos' ORDER BY id",
    )
  ).rows;
  for (let index = 0; index < services.length; index++) {
    const s = services[index];
    if (s.config.active) continue;
    const r = await call("service_manager", "services.checklist.propose", {
      serviceId: s.id,
      branchId: "lagos",
      version: s.checklist_version || 1,
      checks: [
        {
          id: "equipment_check",
          label: "Demo safety assessment checklist; no real work authorised",
          required: true,
        },
      ],
      reason,
    });
    for (const role of ["owner", "safety_officer"])
      await call(role, "approval.decide", {
        id: r.id,
        decision: "approve",
        reason,
      });
    const config = {
      ...s.config,
      active: true,
      description: "Client demo service only. " + s.config.description,
      pricingModel: "fixed",
      priceKobo: 1500000,
      calloutKobo: 0,
      zones: ["Lagos Island", "Victoria Island", "Lekki", "Ajah"],
      cancellationHours: 0,
    };
    const review = await call("service_manager", "services.propose", {
      serviceId: s.id,
      branchId: "lagos",
      version: s.version,
      config,
      reason,
    });
    await call("owner", "approval.decide", {
      id: review.id,
      decision: "approve",
      reason,
    });
    const starts = new Date(Date.now() + 2 * 86400000);
    starts.setUTCHours(8 + index * 2, 0, 0, 0);
    await call("service_manager", "services.slot.create", {
      serviceId: s.id,
      branchId: "lagos",
      technicianId: await uid("technician"),
      startsAt: starts.toISOString(),
      endsAt: new Date(+starts + config.durationMinutes * 60000).toISOString(),
    });
  }
  console.log(
    "Restricted hosted runtime verified; synthetic demo stock, independently approved ordering policy and service catalogue configured. No real messages/payments sent.",
  );
} finally {
  for (const role of Object.keys(tokens))
    await call(role, "logout").catch(() => {});
  await db.close?.();
}
