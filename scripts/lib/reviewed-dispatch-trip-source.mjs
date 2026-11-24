import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {reviewedDispatchJourneySourceHash} from './reviewed-dispatch-journey-source.mjs';
export async function reviewedDispatchTripSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/dispatch-trip/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/api/[action]/route.ts','apps/web/app/product-ui.css','apps/web/components/dispatch-centre.tsx','apps/web/components/dispatch-vehicle.tsx','apps/web/lib/service.ts','packages/business-rules/src/staff-privileges.ts']);
 if(!review.files[file])return reviewedDispatchJourneySourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' dispatch trip historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained committed trip baseline');
 return reviewedDispatchJourneySourceHash(file,review.files[file]);
}
