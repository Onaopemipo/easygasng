import { reviewedFleetUiSourceHash } from "../scripts/lib/reviewed-fleet-ui-source.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
import { reviewedAssignmentSourceHash } from "../scripts/lib/reviewed-assignment-source.mjs";
import { reviewedFleetVerificationSourceHash } from "../scripts/lib/reviewed-fleet-verification-source.mjs";
test("FVERIFY-SOURCE: narrow current proof retains committed historical source and rejects tampered incoming hashes", async () => {
  const review = JSON.parse(
    await readFile(
      "docs/fleet-verification/reviewed-source-changes.json",
      "utf8",
    ),
  );
  const file = "apps/web/components/operations-completion.tsx";
  assert.equal(
    await reviewedFleetVerificationSourceHash(file, review.baseline[file]),
    createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
  );
  await assert.rejects(
    () => reviewedFleetVerificationSourceHash(file, "0".repeat(64)),
    /historical baseline/,
  );
  assert.equal(
    await reviewedFleetVerificationSourceHash(
      "apps/mobile/unreviewed-surface.tsx",
      "unchanged-native",
    ),
    "unchanged-native",
  );
  const original = JSON.parse(
    await readFile(
      "docs/driver-assignment/reviewed-source-changes.json",
      "utf8",
    ),
  );
  assert.equal(
    await reviewedAssignmentSourceHash(file, original.baseline[file]),
    await reviewedFleetUiSourceHash(file, review.files[file]),
  );
});
test("FVERIFY-AUTH: unverified/expired owners and verified nonowners cannot register; normal reauth permits one idempotent registration without raising suitability", async () => {
  const f = await fixture();
  const body = {
    branchId: "lagos",
    label: "SYNTHETIC FLEET VERIFICATION FIXTURE",
    capacityGrams: 2000,
    lpgSuitable: false,
    operationKey: id(),
  };
  const count = async () =>
      Number((await one(f.db, "SELECT count(*) AS n FROM driver_vehicles"))!.n),
    before = await count();
  const denied = (r: any, code: string) => r?.code === code;
  await assert.rejects(
    () => f.call("owner", "fleet.vehicle.create", body),
    (e: any) => denied(e, "REAUTH_REQUIRED"),
  );
  assert.equal(await count(), before);
  await assert.rejects(() =>
    f.call("owner", "reauth", { password: "incorrect-fixture-password" }),
  );
  assert.equal(await count(), before);
  await f.call("dispatcher", "reauth", {
    password: "Tracking-fixture-only-123!",
  });
  await assert.rejects(
    () =>
      f.call("dispatcher", "fleet.vehicle.create", {
        ...body,
        operationKey: id(),
      }),
    (e: any) => e.status === 403,
  );
  assert.equal(await count(), before);
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  await assert.rejects(
    () =>
      f.call("owner", "fleet.vehicle.create", {
        ...body,
        branchId: "nonexistent",
        operationKey: id(),
      }),
    (e: any) => e.status === 400,
  );
  assert.equal(await count(), before);
  const made = await f.call("owner", "fleet.vehicle.create", body);
  assert.ok(made.id);
  const replay = await f.call("owner", "fleet.vehicle.create", body);
  assert.equal(replay.id, made.id);
  assert.equal(await count(), before + 1);
  assert.equal(
    (await one(f.db, "SELECT lpg_suitable FROM driver_vehicles WHERE id=$1", [
      made.id,
    ]))!.lpg_suitable,
    false,
  );
  await f.db.query(
    "UPDATE sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1",
    [f.actors.owner.id],
  );
  await assert.rejects(
    () =>
      f.call("owner", "fleet.vehicle.create", { ...body, operationKey: id() }),
    (e: any) => denied(e, "REAUTH_REQUIRED"),
  );
  assert.equal(await count(), before + 1);
});

test("FLEETUI-SOURCE: scoped web continuation preserves historical hashes and current implementation while native and server code stay outside its allowlist", async () => {
  const { reviewedDispatchSetupSourceHash } = await import("../scripts/lib/reviewed-dispatch-setup-source.mjs");
  const review = JSON.parse(await readFile("docs/dispatch-fleet-redesign/reviewed-source-changes.json", "utf8"));
  for (const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(await reviewedDispatchSetupSourceHash(file, await reviewedFleetUiSourceHash(file, baseline)), createHash("sha256").update(await readFile(file)).digest("hex"));
    await assert.rejects(() => reviewedFleetUiSourceHash(file, "tampered"), /fleet UI historical baseline/);
  }
  for (const [file, hash] of Object.entries(review.newFiles)) assert.equal(createHash("sha256").update(await readFile(file)).digest("hex"), hash);
  assert.equal(await reviewedFleetUiSourceHash("apps/mobile/App.tsx", "unchanged-native"), "unchanged-native");
  assert.equal(await reviewedFleetUiSourceHash("apps/web/lib/driver-operations.ts", "unchanged-server"), "unchanged-server");
});
