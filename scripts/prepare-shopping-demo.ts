// Explicitly authorised local test stock. Never run against business/hosted data.
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(process.cwd()),
  directory = path.join(root, ".data/mobile-demo-accounts");
if (process.env.NODE_ENV === "production" || process.env.DATABASE_URL)
  throw new Error("Local demo only.");
const manifest = JSON.parse(
  await readFile(path.join(root, ".data/mobile-demo-credentials.json"), "utf8"),
);
if (
  manifest.purpose !== "isolated-mobile-demo" ||
  manifest.database !== directory
)
  throw new Error("Unexpected demo manifest.");
const lock = (await readFile(directory + ".lock", "utf8")).trim();
const listeners = execFileSync(
  "lsof",
  ["-t", "-nP", "-iTCP:3003", "-sTCP:LISTEN"],
  { encoding: "utf8" },
)
  .trim()
  .split(/\s+/);
if (!listeners.includes(lock))
  throw new Error("Port3003 does not own the isolated demo database.");
const tokens: Record<string, string> = {};
async function call(role: string, action: string, input?: unknown) {
  const r = await fetch("http://127.0.0.1:3003/api/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-easygas-client": "native",
      ...(tokens[role] ? { Authorization: "Bearer " + tokens[role] } : {}),
    },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
  });
  const d = await r.json();
  if (!r.ok) throw new Error(action + ": " + d.error);
  return d;
}
try {
  for (const role of ["owner", "manager", "inventory"]) {
    const a = manifest.accounts.find((v: any) => v.role === role);
    if (!a?.email.endsWith("@demo.easygas.invalid"))
      throw new Error("Only synthetic demo identities permitted.");
    const d = await call(role, "login", {
      email: a.email,
      password: a.password,
    });
    tokens[role] = d.token;
    const me = await call(role, "me");
    if (me.user.role !== role || me.user.email !== a.email)
      throw new Error("Unexpected actor.");
    await call(role, "reauth", { password: a.password });
  }
  let c = await call("", "catalogue");
  if (!c.preview) throw new Error("Development catalogue required.");
  for (const p of c.products.filter(
    (p: any) =>
      p.category === "Empty cylinders" &&
      p.published &&
      Number(p.price_kobo) > 0,
  ))
    await call("inventory", "inventory.receipt", {
      branchId: "lagos",
      productId: p.id,
      quantity: 20,
      reference: "DEMO-SHOPPING-20261106-" + p.id,
      reason: "Synthetic local shopping demonstration; not real inventory",
      evidence: "User authorised isolated demo test stock only",
      receivedDate: "2026-11-06",
      receivingPassed: true,
    });
  await call("inventory", "gas.stock.receive", {
    branchId: "lagos",
    grams: 1000000,
    reference: "DEMO-SHOPPING-20261106-GAS",
    reason: "Synthetic local shopping demonstration; not real bulk gas",
  });
  c = await call("", "catalogue");
  if (c.gas.policy.minimumKg == null) {
    const settings = await call("manager", "settings?scope=lagos");
    const row = (Array.isArray(settings) ? settings : settings.settings).find(
      (s: any) => s.key === "gas.quantity_policy",
    );
    if (!row) throw new Error("Quantity setting not found.");
    const proposed = await call("manager", "setting.propose", {
      key: "gas.quantity_policy",
      scope: "lagos",
      version: row.version,
      value: {
        minimumKg: 0.5,
        maximumKg: 50,
        incrementKg: 0.5,
        precision: 1,
        capacitiesKg: [3, 6, 12.5, 25, 50],
      },
      reason:
        "Synthetic local demonstration limits; not approved business operating limits",
    });
    await call("owner", "approval.decide", {
      id: proposed.id,
      decision: "approve",
      reason:
        "User authorised isolated demo configuration, independent demo owner review",
    });
  }
  c = await call("", "catalogue");
  console.log(
    JSON.stringify(
      {
        environment: "isolated local demo only",
        products: c.products
          .filter((p: any) => p.published)
          .map((p: any) => ({ id: p.id, available: p.available })),
        quantityPolicy: c.gas.policy,
      },
      null,
      2,
    ),
  );
} finally {
  for (const role of Object.keys(tokens))
    await call(role, "logout", {}).catch(() => {});
}
