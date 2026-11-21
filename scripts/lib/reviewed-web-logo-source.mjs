import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Keep historical source proofs; only the two authorised logo CSS edits advance.
export async function reviewedWebLogoSourceHash(file, incoming) {
  const review = JSON.parse(await readFile('docs/web-transparent-logo/reviewed-source-changes.json', 'utf8'));
  assert.deepEqual(Object.keys(review.files).sort(), [
    'apps/web/app/customer-introduction.css', 'apps/web/app/theme.css',
  ]);
  if (!review.files[file]) return incoming;
  assert.equal(incoming, review.baseline[file], file + ' historical logo baseline');
  const original = execFileSync('git', ['show', review.baseCommit + ':' + file], {maxBuffer:32*1024*1024});
  assert.equal(createHash('sha256').update(original).digest('hex'), incoming, file + ' committed source retained');
  return review.files[file];
}
