import {reviewedNativeEdgeSourceHash} from './reviewed-native-edge-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedSensitiveVerificationSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/sensitive-action-verification/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/api/[action]/route.ts','apps/web/components/app-dialog.tsx','apps/web/components/ui.tsx']);
 if(!review.files[file])return reviewedNativeEdgeSourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' sensitive verification historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file])).digest('hex'),incoming,file+' retained committed source');
 return reviewedNativeEdgeSourceHash(file,review.files[file]);
}
