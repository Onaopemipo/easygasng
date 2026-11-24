import assert from 'node:assert/strict';
import {reviewedDispatchVehicleSourceHash} from './reviewed-dispatch-vehicle-source.mjs';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
/** Continue retained historical proofs through the explicit approved setup phase only. */
export async function reviewedDispatchSetupSourceHash(file,incoming){
 const review=JSON.parse(await readFile('docs/dispatch-setup/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(review.files).sort(),['apps/web/app/api/[action]/route.ts','apps/web/app/product-ui.css','apps/web/components/admin.tsx','apps/web/components/dispatch-centre.tsx','apps/web/components/driver-assignment.tsx','apps/web/components/workflows.tsx','apps/web/lib/service.ts']);
 if(!review.files[file])return reviewedDispatchVehicleSourceHash(file,incoming);
 assert.equal(incoming,review.baseline[file],file+' dispatch setup historical baseline');
 assert.equal(createHash('sha256').update(execFileSync('git',['show',review.baseCommit+':'+file],{maxBuffer:32*1024*1024})).digest('hex'),incoming,file+' retained committed setup baseline');
 return reviewedDispatchVehicleSourceHash(file,review.files[file]);
}
