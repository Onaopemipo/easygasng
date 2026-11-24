import {reviewedAdminLoadingSourceHash} from './reviewed-admin-loading-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function reviewedDispatchJourneySourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/dispatch-journey/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/components/driver-delivery-controls.tsx','apps/web/components/driver-experience.tsx','apps/web/lib/delivery-photos.ts']);
 if(!review.files[file])return reviewedAdminLoadingSourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' dispatch journey historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained committed journey baseline');
 return reviewedAdminLoadingSourceHash(file,review.files[file]);
}
