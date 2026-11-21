import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
export async function reviewedFleetVerificationSourceHash(file, incoming) {
  const review = JSON.parse(
    await readFile(
      "docs/fleet-verification/reviewed-source-changes.json",
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(review.files), [
    "apps/web/components/operations-completion.tsx",
  ]);
  if (!review.files[file]) return incoming;
  assert.equal(
    incoming,
    review.baseline[file],
    file + " fleet verification historical baseline",
  );
  assert.equal(
    createHash("sha256")
      .update(execFileSync("git", ["show", review.baseCommit + ":" + file]))
      .digest("hex"),
    incoming,
    file + " retained committed source",
  );
  return review.files[file];
}
