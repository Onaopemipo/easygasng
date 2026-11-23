import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
export async function reviewedNativeUxSourceHash(file, incoming) {
  const review = JSON.parse(
    await readFile(
      "docs/mobile-ux-20261123/reviewed-source-changes.json",
      "utf8",
    ),
  );
  if (!review.files[file]) return incoming;
  assert.equal(
    incoming,
    review.baseline[file],
    file + " retained pre-UX source chain",
  );
  assert.equal(
    createHash("sha256")
      .update(execFileSync("git", ["show", review.baseCommit + ":" + file]))
      .digest("hex"),
    incoming,
    file + " committed UX baseline",
  );
  return review.files[file];
}
