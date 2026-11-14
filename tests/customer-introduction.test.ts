import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canAutoShowIntroduction,
  introductionAudience,
  introductionBenefits,
  introductionIndex,
  introductionScenes,
  nativeIntroductionKey,
  shouldShowFirstIntroduction,
  webIntroductionKey,
} from "../packages/business-rules/src/customer-introduction";

test("ONB-004: verified customer home only; staff, unresolved links and non-home screens cannot auto-open", () => {
  const input = {
    role: "customer",
    initialLinkResolved: true,
    home: true,
    dedicatedStaffShell: false,
  };
  assert.equal(canAutoShowIntroduction(input), true);
  assert.equal(canAutoShowIntroduction({ ...input, role: "commercial" }), true);
  for (const role of [
    undefined,
    null,
    "owner",
    "admin",
    "finance",
    "manager",
    "driver",
    "technician",
    "unknown",
    "unverified",
  ]) {
    assert.equal(canAutoShowIntroduction({ ...input, role }), false);
    if (role) assert.equal(introductionAudience(role), "excluded");
  }
  assert.equal(introductionAudience(undefined), "guest");
  assert.equal(
    canAutoShowIntroduction({ ...input, dedicatedStaffShell: true }),
    false,
  );
  assert.equal(
    canAutoShowIntroduction({ ...input, initialLinkResolved: false }),
    false,
  );
  assert.equal(canAutoShowIntroduction({ ...input, home: false }), false);
});

test("ONB-004: any historical seen value is respected without using identity data", () => {
  assert.equal(nativeIntroductionKey, "easygas.onboarding.v1");
  assert.notEqual(nativeIntroductionKey, webIntroductionKey);
  assert.equal(shouldShowFirstIntroduction(null, true), true);
  assert.equal(shouldShowFirstIntroduction(null, false), false);
  for (const seen of ["seen", "true", "v1"])
    assert.equal(shouldShowFirstIntroduction(seen, true), false);
});

test("ONB-001/002/003: navigation is bounded and claims preserve actual availability and verification constraints", () => {
  assert.deepEqual(
    introductionScenes.map((scene) => scene.id),
    ["ONB-001", "ONB-002", "ONB-003"],
  );
  assert.equal(introductionIndex(0, -1), 0);
  assert.equal(introductionIndex(0, 1), 1);
  assert.equal(introductionIndex(2, 1), 2);
  assert.equal(introductionIndex(2, -1), 1);
  assert.match(introductionScenes[0].body, /supported areas/);
  assert.match(
    introductionScenes[1].body,
    /recorded updates.*only when available/,
  );
  assert.match(
    introductionBenefits[0].detail,
    /qualified technicians and available appointments/,
  );
  assert.match(introductionBenefits[1].detail, /current rewards policy/);
  assert.match(
    introductionBenefits[2].detail,
    /verified delivery history.*not sensor readings/,
  );
});
