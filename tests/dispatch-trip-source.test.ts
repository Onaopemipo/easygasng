import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { reviewedDispatchTripSourceHash } from "../scripts/lib/reviewed-dispatch-trip-source.mjs";
test("TC-SOURCE: six reviewed continuations retain historical hashes, with native/driver/final-order code excluded; review endpoints cannot write", async () => {
  const r = JSON.parse(
    await fs.readFile(
      "docs/dispatch-trip/reviewed-source-changes.json",
      "utf8",
    ),
  );
  for (const [file, hash] of Object.entries(r.baseline)) {
    assert.equal(
      await reviewedDispatchTripSourceHash(file, hash),
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
    );
    await assert.rejects(
      () => reviewedDispatchTripSourceHash(file, "tampered"),
      /dispatch trip historical baseline/,
    );
  }
  for (const file of [
    "apps/mobile/App.tsx",
    "apps/web/lib/driver-operations.ts",
    "apps/web/lib/fleet-constraints.ts",
    "apps/web/lib/vehicle-products.ts",
    "apps/web/lib/bulk-lpg.ts",
  ])
    assert.equal(
      await reviewedDispatchTripSourceHash(file, "retained"),
      "retained",
    );
  const route = await fs.readFile("apps/web/app/api/[action]/route.ts", "utf8"),
    reads = route.slice(
      route.indexOf("const reads"),
      route.indexOf("async function readBoundedBody"),
    );
  assert.match(reads, /dispatch.trip.options/);
  assert.match(reads, /dispatch.trip.review/);
  assert.doesNotMatch(reads, /dispatch.trip.end|dispatch.trip.change/);
});
