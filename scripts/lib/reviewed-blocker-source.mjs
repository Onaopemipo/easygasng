import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {reviewedWebLogoSourceHash} from './reviewed-web-logo-source.mjs';
// Preserve historical proofs and bind only this explicit approved web continuation.
export async function reviewedBlockerSourceHash(file, incoming){
 const review=JSON.parse(await readFile('docs/blocker-reconciliation/reviewed-source-changes.json','utf8'));
 if(!review.files[file])return reviewedWebLogoSourceHash(file, incoming);
 assert.ok(file.startsWith('apps/web/'),'This continuation cannot alter native/prototype proofs');
 assert.equal(incoming,review.baseline[file],file+' must continue the historical hash');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' committed baseline retained');
 return review.files[file];
}
