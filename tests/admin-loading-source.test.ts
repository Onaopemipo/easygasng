import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { reviewedAdminLoadingSourceHash } from '../scripts/lib/reviewed-admin-loading-source.mjs';
const sha=(b:any)=>createHash('sha256').update(b).digest('hex');
test('AL-SOURCE: exact reviewed read-only repairs retain committed baselines; native, mutation, finance, stock and assignment guards remain unchanged',async()=>{
 const r=JSON.parse(await readFile('docs/admin-loading-20261124/reviewed-source-changes.json','utf8'));
 assert.deepEqual(Object.keys(r.files).sort(),['apps/web/components/admin-overview.tsx','apps/web/lib/admin-dashboard.ts','apps/web/lib/navigation.ts']);
 for(const f of Object.keys(r.files)){
  assert.equal(sha(execFileSync('git',['show',r.baseCommit+':'+f])),r.baseline[f]);assert.equal(sha(await readFile(f)),r.files[f]);assert.equal(await reviewedAdminLoadingSourceHash(f,r.baseline[f]),r.files[f]);await assert.rejects(()=>reviewedAdminLoadingSourceHash(f,'tampered'),/admin loading historical baseline/);
 }
 assert.deepEqual(Object.keys(r.additions),['apps/web/lib/admin-dashboard-batch.ts']);
 assert.equal(sha(await readFile('apps/web/lib/admin-dashboard-batch.ts')),r.additions['apps/web/lib/admin-dashboard-batch.ts']);
 for(const f of ['apps/web/lib/auth.ts','apps/web/lib/dispatch-trip.ts','apps/web/lib/dispatch-vehicle.ts','apps/web/lib/order-tracking.ts','apps/web/lib/inventory-business.ts','apps/web/lib/business-reporting.ts','apps/web/lib/bulk-lpg.ts','apps/web/lib/vehicle-products.ts','packages/business-rules/src/staff-privileges.ts'])assert.equal(sha(await readFile(f)),sha(execFileSync('git',['show',r.baseCommit+':'+f])));
 assert.equal(execFileSync('git',['diff',r.baseCommit,'--','apps/mobile'],{encoding:'utf8'}),'');
 assert.equal(await reviewedAdminLoadingSourceHash('apps/mobile/App.tsx','retained-native'),'retained-native');
});
