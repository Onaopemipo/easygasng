import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedRoleAcceptanceSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/role-order-acceptance-20261121/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files),['apps/web/lib/driver-operations.ts']);
 if(!review.files[file])return incoming;
 assert.equal(incoming,review.baseline[file],file+' historical role-acceptance baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained committed baseline');
 return review.files[file];
}
