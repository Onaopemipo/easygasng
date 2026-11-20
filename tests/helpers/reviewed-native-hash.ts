import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
// Extend earlier preservation guards through the existing approved phases.
// Every transition must match both its incoming hash and its historical commit.
export async function reviewedNativeHash(
  file: string,
  prior: string,
): Promise<string> {
  if (!file.startsWith("apps/mobile/")) return prior;
  for (const phase of [
    "mobile-transparent-logo",
    "mobile-orders-text-fix",
    "native-order-authority",
    "mobile-device-acceptance",
  ]) {
    const review = JSON.parse(
      await readFile(`docs/${phase}/reviewed-source-changes.json`, "utf8"),
    );
    if (!review.files[file]) continue;
    assert.equal(
      review.baseline[file],
      prior,
      `${file}: ${phase} must continue the prior approved hash`,
    );
    assert.equal(
      createHash("sha256")
        .update(
          execFileSync("git", ["show", review.baseCommit + ":" + file], {
            maxBuffer: 8 * 1024 * 1024,
          }),
        )
        .digest("hex"),
      review.baseline[file],
      `${file}: ${phase} baseline must match retained commit`,
    );
    prior = review.files[file];
  }
  return prior;
}
