import {assertReviewedAuthenticationNativeScope} from "../scripts/lib/reviewed-authentication-source.mjs";
import test from 'node:test';
import {reviewedDispatchJourneySourceHash} from '../scripts/lib/reviewed-dispatch-journey-source.mjs';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
test('DJ-SOURCE: three reviewed web proof/completion repairs retain committed baselines and leave native, role, payment, assignment and physical reconciliation guards unchanged',async()=>{
 const r=JSON.parse(await readFile('docs/dispatch-journey/reviewed-source-changes.json','utf8'));const digest=(b:any)=>createHash('sha256').update(b).digest('hex');
 assert.deepEqual(Object.keys(r.files).sort(),['apps/web/components/driver-delivery-controls.tsx','apps/web/components/driver-experience.tsx','apps/web/lib/delivery-photos.ts']);
 for(const f of Object.keys(r.files)){assert.equal(await reviewedDispatchJourneySourceHash(f,r.baseline[f]),r.files[f]);await assert.rejects(()=>reviewedDispatchJourneySourceHash(f,'tampered'),/dispatch journey historical baseline/);assert.equal(digest(execFileSync('git',['show',r.baseCommit+':'+f])),r.baseline[f]);assert.equal(digest(await readFile(f)),r.files[f]);}
 for(const f of ['apps/web/lib/auth.ts','apps/web/lib/dispatch-trip.ts','apps/web/lib/dispatch-vehicle.ts','apps/web/lib/order-tracking.ts','apps/web/lib/fleet-constraints.ts','apps/web/lib/bulk-lpg.ts','apps/web/lib/vehicle-products.ts','packages/business-rules/src/staff-privileges.ts'])assert.equal(digest(await readFile(f)),digest(execFileSync('git',['show',r.baseCommit+':'+f])));
 assert.equal(await reviewedDispatchJourneySourceHash('apps/mobile/App.tsx','retained-native'),'retained-native');
 await assertReviewedAuthenticationNativeScope(r.baseCommit);
});
