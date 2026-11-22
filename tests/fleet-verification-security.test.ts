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
    review.files[file],
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
