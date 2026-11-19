import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { client, hash } from "./demo-role-acceptance-client.mjs";
test("ANALYTICS-DEPLOY: stable analytics deployment preserves all orders, ledger, inventory, gas and QA wallet", async () => {
  const c = await client();
  const before = JSON.parse(
    await readFile(".data/analytics-business-baseline.json", "utf8"),
  );
  const after = {
    orders: await c.ok("owner", "orders"),
    ledger: await c.ok("finance", "finance.ledger"),
    inventory: await c.ok("inventory", "inventory"),
    gas: (await c.ok("inventory", "inventory.workspace")).gas,
    wallet: await c.ok("customer", "wallet"),
  };
  for (const [key, value] of Object.entries(after))
    assert.deepEqual(value, before[key], key);
  assert.equal(after.orders.length, 13);
  await writeFile(
    "docs/analytics/evidence/business-after.json",
    JSON.stringify(
      {
        ...Object.fromEntries(
          Object.entries(after).map(([k, v]) => [k + "Hash", hash(v)]),
        ),
        orders: after.orders.length,
        unchanged: true,
      },
      null,
      2,
    ) + "\n",
  );
});
