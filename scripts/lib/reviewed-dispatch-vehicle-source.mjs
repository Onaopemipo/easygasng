import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
/** Exact approved administrative vehicle-assignment continuation, never native or final order guards. */
export async function reviewedDispatchVehicleSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/dispatch-vehicle/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/api/[action]/route.ts','apps/web/app/product-ui.css','apps/web/components/dispatch-centre.tsx','apps/web/components/dispatch-setup.tsx','apps/web/components/driver-assignment.tsx','apps/web/lib/service.ts','packages/business-rules/src/assignment-requirements.ts','packages/business-rules/src/staff-privileges.ts']);
 if(!review.files[file])return incoming;
 assert.equal(incoming,review.baseline[file],file+' dispatch vehicle historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained committed vehicle baseline');
 return review.files[file];
}
