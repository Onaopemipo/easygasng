import { AppError, digest, id } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";

export const phoneOrderFingerprint = (o: any) =>
  digest(
    JSON.stringify([
      o.id,
      o.customer_id,
      o.branch_id,
      Number(o.total_kobo),
      o.payment_method,
      o.location_id,
      o.address,
    ]),
  );

/** Shared by payment posting and fulfilment. A COD policy never overrides phone prepayment. */
export async function phoneOrderProfileReady(tx: SQL, o: any) {
  if (o.order_source !== "PHONE_ASSISTED") return;
  const l = await one(
    tx,
    `SELECT id FROM phone_order_payment_links WHERE order_id=$1 AND customer_id=$2
  AND (revoked_at IS NULL OR $4::boolean) AND profile_completed_at IS NOT NULL AND order_fingerprint=$3 LIMIT 1`,
    [
      o.id,
      o.customer_id,
      phoneOrderFingerprint(o),
      o.payment_status === "verified",
    ],
  );
  if (
    !l &&
    o.payment_status === "verified" &&
    (await one(
      tx,
      "SELECT o.id FROM orders o WHERE o.id=$1 AND o.created_at<(SELECT applied_at FROM schema_migrations WHERE version='083') AND NOT EXISTS(SELECT 1 FROM phone_order_payment_links l WHERE l.order_id=o.id) AND (SELECT COALESCE(sum(p.amount_kobo),0) FROM verified_payments p WHERE p.order_id=o.id)>=o.total_kobo",
      [o.id],
    ))
  )
    return;
  if (!l)
    throw new AppError(
      409,
      "The customer must confirm their basic details and delivery address using the phone-order payment link.",
    );
}
export async function requirePaidPhoneOrder(tx: SQL, o: any) {
  if (o.order_source !== "PHONE_ASSISTED") return;
  await phoneOrderProfileReady(tx, o);
  const paid = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) n FROM verified_payments WHERE order_id=$1",
      [o.id],
    ))!.n,
  );
  if (o.payment_status !== "verified" || paid < Number(o.total_kobo))
    throw new AppError(
      409,
      "This phone order is awaiting verified customer payment. Send its payment link before dispatch.",
    );
}

/** Called only after authenticated provider evidence posts the canonical ledger. */
export async function confirmPaidPhoneOrder(tx: SQL, orderId: string) {
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    orderId,
  ]);
  if (!o || o.order_source !== "PHONE_ASSISTED") return;
  await requirePaidPhoneOrder(tx, o);
  if (o.status === "placed") {
    await tx.query("UPDATE orders SET status='accepted' WHERE id=$1", [o.id]);
    await tx.query(
      "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES($1,$2,'accepted',$3,'Phone order confirmed after provider-verified payment and customer profile/address confirmation')",
      [id(), o.id, o.assisted_by],
    );
    await audit(tx, null, "phone_order.payment_confirmed", o.id);
  }
  // Same-visit staff intent is retained, but assignment still runs every current server check.
  const visit = await one(
    tx,
    "SELECT * FROM order_visit_links WHERE order_id=$1",
    [o.id],
  );
  if (visit && ["placed", "accepted", "preparing"].includes(o.status)) {
    await tx.query("SAVEPOINT phone_paid_assign");
    try {
      const staff = await one(
        tx,
        "SELECT id,name,email,role,branch_id,NULL::timestamptz verified_at,''::text session_id FROM users WHERE id=$1 AND active=true AND role IN ('owner','manager')",
        [o.assisted_by],
      );
      if (!staff)
        throw new AppError(
          409,
          "The original staff account is no longer authorised.",
        );
      staff.privilege_overrides = Object.fromEntries(
        (
          await tx.query(
            "SELECT privilege,effect FROM staff_privilege_overrides WHERE user_id=$1 AND (effect='deny' OR (invalidated_at IS NULL AND role_at_change=$2 AND branch_at_change IS NOT DISTINCT FROM $3))",
            [staff.id, staff.role, staff.branch_id],
          )
        ).rows.map((r) => [r.privilege, r.effect]),
      );
      const { enforceStaffPrivilege } = await import("./staff-privileges");
      enforceStaffPrivilege(staff as any, "dispatch.assign");
      if (
        process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "false" ||
        (process.env.NODE_ENV === "production" &&
          (process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "true" ||
            process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true"))
      )
        throw new AppError(
          409,
          "Assignment is disabled by current release controls.",
        );
      const { transitionOrder } = await import("./operations");
      if (o.status !== "preparing")
        await transitionOrder(tx, staff as any, {
          id: o.id,
          status: "preparing",
          note: "Paid extra phone order prepared for its existing customer visit",
        });
      await transitionOrder(tx, staff as any, {
        id: o.id,
        status: "assigned",
        driverId: visit.driver_id,
        note: "Provider-verified extra phone order assigned to the original active visit",
      });
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      await tx.query("ROLLBACK TO SAVEPOINT phone_paid_assign");
      await audit(tx, null, "phone_order.dispatch_review", o.id, "success", {
        reason: e.message,
      });
    } finally {
      await tx.query("RELEASE SAVEPOINT phone_paid_assign");
    }
  }
}
