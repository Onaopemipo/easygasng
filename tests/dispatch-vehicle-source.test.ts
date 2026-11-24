import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {reviewedDispatchVehicleSourceHash} from '../scripts/lib/reviewed-dispatch-vehicle-source.mjs';
test('DV-SOURCE: exactly eight approved web continuations retain committed baselines; native, self-start, GPS and final assignment guards are untouched',async()=>{
 const review=JSON.parse(await fs.readFile('docs/dispatch-vehicle/reviewed-source-changes.json','utf8'));
 for(const [file,baseline]of Object.entries(review.baseline)){assert.equal(await reviewedDispatchVehicleSourceHash(file,baseline),createHash('sha256').update(await fs.readFile(file)).digest('hex'));await assert.rejects(()=>reviewedDispatchVehicleSourceHash(file,'tampered'),/dispatch vehicle historical baseline/);}
 for(const file of ['apps/mobile/App.tsx','apps/web/lib/driver-operations.ts','apps/web/lib/fleet-constraints.ts'])assert.equal(await reviewedDispatchVehicleSourceHash(file,'retained'),'retained');
 const route=await fs.readFile('apps/web/app/api/[action]/route.ts','utf8');assert.match(route.slice(route.indexOf('const reads'),route.indexOf('const reads')+1100),/dispatch.vehicle.options/);assert.doesNotMatch(route.slice(route.indexOf('const reads'),route.indexOf('async function readBoundedBody')),/dispatch.vehicle.assign/);
});
