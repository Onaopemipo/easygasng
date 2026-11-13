import { consolidatedRole } from "../../packages/business-rules/src/staff-roles";
import { fixture } from "./order-tracking-fixture";
import { id, hashPassword, issueSession } from "../../apps/web/lib/auth";
import { one, type DB } from "../../apps/web/lib/db";
export async function rewardsFixture(database?: DB) {
  const f = await fixture(database);
  for (const role of ["finance", "owner2", "manager"]) {
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [
        uid,
        role,
        uid + "@rewards.example.test",
        hashPassword("Tracking-fixture-only-123!"),
        consolidatedRole(role === "owner2" ? "owner" : role),
      ],
    );
    f.actors[role] = { id: uid, token: await issueSession(f.db, uid) };
  }
  const policy = {
    earningEnabled: true,
    redemptionEnabled: true,
    spendPerPointKobo: 10000,
    discountPerPointKobo: 100,
    minimumPoints: 10,
    maximumDiscountBps: 2000,
    eligibleCategories: [
      (await one(f.db, "SELECT category FROM products WHERE id='hose'"))!
        .category,
      "Gas refills",
    ],
    referralPoints: 0,
    referralEnabled: false,
  };
  const approve = async (value = policy) => {
    for (const role of ["owner", "owner2", "finance"])
      await f.call(role, "reauth", { password: "Tracking-fixture-only-123!" });
    const s = await one(
      f.db,
      "SELECT version FROM settings WHERE key='loyalty.policy' AND scope='lagos'",
    );
    const r = await f.call("owner", "setting.propose", {
      key: "loyalty.policy",
      scope: "lagos",
      version: s!.version,
      value,
      reason: "Synthetic policy for isolated rewards tests only",
    });
    await f.call("owner2", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Independent synthetic owner approval",
    });
    await f.call("finance", "approval.decide", {
      id: r.id,
      decision: "approve",
      reason: "Independent synthetic finance approval",
    });
    return r;
  };
  const fulfilled = async () => {
    const o = await f.ready();
    const own = (await f.call("customer", "orders", { id: o.id }))[0];
    await f.call("driver", "delivery.complete", {
      orderId: o.id,
      version: o.tracking_version,
      operationKey: id(),
      code: own.confirmation_code,
      handover: true,
      collectedKobo: Number(o.total_kobo),
    });
    return o;
  };
  return { ...f, policy, approve, fulfilled };
}
