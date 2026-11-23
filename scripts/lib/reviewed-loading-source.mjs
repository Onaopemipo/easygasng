import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedLoadingSourceHash(file,incoming) {
  const review=JSON.parse(await readFile('docs/loading-performance/reviewed-source-changes.json','utf8'));
  assert.deepEqual(Object.keys(review.files).sort(),['apps/web/components/admin.tsx','apps/web/components/ui.tsx','apps/web/lib/driver-operations.ts','apps/web/lib/service.ts','apps/web/lib/vehicle-products.ts']);
  if(!review.files[file])return incoming;
  assert.equal(incoming,review.baseline[file],file+' loading repair historical baseline');
  assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained published loading baseline');
  return review.files[file];
}
