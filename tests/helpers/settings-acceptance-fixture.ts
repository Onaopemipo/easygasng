import { createDatabase, migrate, one } from "../../apps/web/lib/db";
import { dispatch } from "../../apps/web/lib/service";
import { hashPassword, id, issueSession } from "../../apps/web/lib/auth";
import { accountRoles } from "../../packages/business-rules/src/staff-roles";
export async function settingsFixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const password = "Synthetic-acceptance-only-123!";
  const actors: Record<string, any> = {};
  await db.query(
    "INSERT INTO branches(id,name) VALUES('qa-other','Synthetic other branch')",
  );
  for (const role of [...accountRoles, "reviewer", "inactive", "other"]) {
    const uid = id(),
      canonical = ["reviewer", "inactive"].includes(role)
        ? "owner"
        : role === "other"
          ? "manager"
          : role;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id,active,verified) VALUES($1,$2,$3,$4,$5,$6,true,true)",
      [
        uid,
        "Synthetic " + role,
        role + "@acceptance.example.test",
        hashPassword(password),
        canonical,
        role === "other" ? "qa-other" : "lagos",
      ],
    );
    actors[role] = { id: uid, token: await issueSession(db, uid) };
  }
  await db.query("UPDATE users SET active=false WHERE id=$1", [
    actors.inactive.id,
  ]);
  const call = (role: string, action: string, input: any = {}) =>
    dispatch(action, actors[role]?.token ?? null, input, db);
  const rows = (
    await db.query(
      "SELECT d.*,s.value,s.scope,s.version FROM setting_definitions d JOIN settings s ON s.key=d.key AND s.scope='lagos' WHERE d.value_type<>'inventory_operation'",
    )
  ).rows;
  const value = (d: any) => {
    switch (d.value_type) {
      case "money":
        return Math.max(d.minimum ?? 0, Math.min(d.maximum ?? 100000, 100000));
      case "document_identity":
        return {
          legalName: "Synthetic QA Company",
          address: "Synthetic QA address",
          phone: "+2347000000000",
          email: "",
          website: "",
          registrationNumber: "",
          taxId: "",
          verificationReference: "Synthetic QA only",
        };
      case "checklist":
        return [
          {
            id: "inspection",
            label: "Synthetic qualified inspection step",
            required: true,
          },
        ];
      case "rewards_adjustment":
        return {
          customerId: actors.customer.id,
          points: 1,
          reason: "Synthetic points correction",
          evidence: "Synthetic QA only evidence",
        };
      case "referral_review":
        return {
          attributionId: id(),
          state: "held",
          reason: "Synthetic QA referral review",
        };
      case "bank":
        return {
          account: "0000000000",
          bank: "Synthetic sandbox bank",
          name: "Synthetic QA only",
        };
      case "access":
        return { userId: actors.driver.id, role: "driver", branchId: "lagos" };
      default:
        return structuredClone(d.value);
    }
  };
  const input = (d: any, extra: any = {}) => ({
    key: d.key,
    scope: "lagos",
    version: d.version,
    value: value(d),
    reason: "Synthetic Settings acceptance only",
    draft: true,
    ...extra,
  });
  const current = (key: string) =>
    one(db, "SELECT * FROM settings WHERE key=$1 AND scope='lagos'", [key]);
  return { db, actors, password, call, rows, value, input, current };
}
