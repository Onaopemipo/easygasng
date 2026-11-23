import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
/** Preserve committed historical proofs through the authorised web fleet presentation change. */
export async function reviewedFleetUiSourceHash(file, incoming) {
  const review = JSON.parse(
    await readFile(
      "docs/dispatch-fleet-redesign/reviewed-source-changes.json",
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(review.files).sort(), [
    "apps/web/app/globals.css",
    "apps/web/components/dispatch-centre.tsx",
    "apps/web/components/operations-completion.tsx",
    "apps/web/components/vehicle-manifest-panel.tsx",
  ]);
  if (!review.files[file]) return incoming;
  assert.equal(
    incoming,
    review.baseline[file],
    file + " fleet UI historical baseline",
  );
  assert.equal(
    createHash("sha256")
      .update(
        execFileSync("git", ["show", review.baseCommit + ":" + file], {
          maxBuffer: 32 * 1024 * 1024,
        }),
      )
      .digest("hex"),
    incoming,
    file + " retained committed source",
  );
  return review.files[file];
}
