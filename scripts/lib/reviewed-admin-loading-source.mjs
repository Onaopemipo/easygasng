import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
export async function reviewedAdminLoadingSourceHash(file, incoming) {
  const review = JSON.parse(await readFile('docs/admin-loading-20261124/reviewed-source-changes.json', 'utf8'));
  assert.deepEqual(Object.keys(review.files).sort(), ['apps/web/components/admin-overview.tsx', 'apps/web/lib/admin-dashboard.ts', 'apps/web/lib/navigation.ts']);
  if (!review.files[file]) return incoming;
  assert.equal(incoming, review.baseline[file], file + ' admin loading historical baseline');
  assert.equal(createHash('sha256').update(execFileSync('git', ['show', review.baseCommit + ':' + file], { maxBuffer: 32 * 1024 * 1024 })).digest('hex'), incoming, file + ' retained committed admin loading baseline');
  return review.files[file];
}
