import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedAssignmentSourceHash(file, incoming) {
  const review = JSON.parse(await readFile('docs/driver-assignment/reviewed-source-changes.json','utf8'));
  assert.deepEqual(Object.keys(review.files).sort(), [
    'apps/web/app/product-ui.css', 'apps/web/components/admin-order-details.tsx',
    'apps/web/components/dispatch-centre.tsx', 'apps/web/components/operations-completion.tsx',
    'apps/web/lib/dispatch-centre.ts', 'apps/web/lib/fleet-constraints.ts',
  ]);
  if (!review.files[file]) return incoming;
  assert.equal(incoming, review.baseline[file], file + ' historical assignment baseline');
  const original = execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024});
  assert.equal(createHash('sha256').update(original).digest('hex'),incoming,file + ' committed source retained');
  return review.files[file];
}
