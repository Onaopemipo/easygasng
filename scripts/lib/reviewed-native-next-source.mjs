import { reviewedLoadingSourceHash } from "./reviewed-loading-source.mjs";
import { reviewedFleetUiSourceHash } from "./reviewed-fleet-ui-source.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
/** Extend historical proofs through the user-approved native design adoption. */
export async function reviewedNativeNextSourceHash(file, incoming) {
  const review = JSON.parse(
    await readFile(
      "docs/mobile-native-next/reviewed-source-changes.json",
      "utf8",
    ),
  );
  if (!review.files[file]) return reviewedLoadingSourceHash(file, await reviewedFleetUiSourceHash(file, incoming));
  assert.equal(
    incoming,
    review.baseline[file],
    file + " native next source chain",
  );
  assert.equal(
    createHash("sha256")
      .update(
        execFileSync("git", ["show", review.baseCommit + ":" + file], {
          maxBuffer: 16 * 1024 * 1024,
        }),
      )
      .digest("hex"),
    incoming,
    file + " committed native next baseline",
  );
  return reviewedLoadingSourceHash(file, review.files[file]);
}
