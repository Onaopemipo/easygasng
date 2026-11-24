import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { reviewedDispatchSetupSourceHash } from "../scripts/lib/reviewed-dispatch-setup-source.mjs";
test("DS-SOURCE: seven reviewed web continuations preserve committed baselines; new setup route is read-only and native/final guards stay outside the allowlist", async () => {
  const review = JSON.parse(await fs.readFile("docs/dispatch-setup/reviewed-source-changes.json", "utf8"));
  for (const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(await reviewedDispatchSetupSourceHash(file, baseline), createHash("sha256").update(await fs.readFile(file)).digest("hex"));
    await assert.rejects(() => reviewedDispatchSetupSourceHash(file, "tampered"), /dispatch setup historical baseline/);
  }
  assert.equal(await reviewedDispatchSetupSourceHash("apps/mobile/App.tsx", "retained"), "retained");
  assert.equal(await reviewedDispatchSetupSourceHash("apps/web/lib/fleet-constraints.ts", "retained"), "retained");
  const route = await fs.readFile("apps/web/app/api/[action]/route.ts", "utf8");
  assert.match(route.slice(route.indexOf("const reads"), route.indexOf("const reads") + 1000), /"dispatch.setup"/);
  const read = await fs.readFile("apps/web/lib/dispatch-setup.ts", "utf8");
  assert.doesNotMatch(read, /\b(?:INSERT|UPDATE|DELETE|FOR UPDATE)\b/);
});
