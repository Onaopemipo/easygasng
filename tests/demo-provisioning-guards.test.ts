import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("DEMO-GUARD01: isolated role fixtures refuse production and hosted database environments", () => {
  for (const extra of [
    { NODE_ENV: "production" },
    { DATABASE_URL: "postgresql://fixture.invalid/blocked" },
  ]) {
    const r = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/prepare-mobile-demo.ts"],
      { env: { ...process.env, ...extra }, encoding: "utf8", timeout: 15000 },
    );
    assert.notEqual(r.status, 0);
    assert.match(
      r.stderr,
      /Local demo only; hosted database configuration is forbidden/,
    );
  }
});
