import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("SHOP-GUARD: shopping fixture refuses production and hosted database configuration before accessing accounts", () => {
  for (const env of [
    { NODE_ENV: "production", DATABASE_URL: "" },
    {
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://blocked.invalid/no_connection_permitted",
    },
  ]) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/prepare-shopping-demo.ts"],
      { encoding: "utf8", env: { ...process.env, ...env } },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Local demo only/);
  }
});
