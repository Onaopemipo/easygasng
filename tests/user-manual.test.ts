import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const base='docs/user-manual/';
const read=(name:string)=>JSON.parse(readFileSync(base+name,'utf8'));
test('UM-COVERAGE: every inventoried route has actual browser evidence and all six role perspectives are retained',()=>{
 const inventory=read('evidence/route-inventory.json'),coverage=read('evidence/route-coverage.json'),views=read('evidence/browser-audit.json');
 assert.equal(inventory.length,86);assert.equal(coverage.length,86);
 assert.equal(new Set(inventory.map((x:any)=>x.route)).size,86);
 for(const r of inventory){const c=coverage.find((x:any)=>x.route===r.route);assert.ok(c?.evidence.length,r.route);for(const f of c.evidence)assert.ok(existsSync(base+f),f);}
 for(const role of ['customer','owner','manager','finance','driver','technician'])assert.ok(views.some((v:any)=>v.role===role),role);
 assert.equal(coverage.filter((x:any)=>x.classification==='Unpublished policy').length,8);
 const negatives=read('evidence/role-boundaries.json');assert.equal(negatives.checks.length,15);assert.equal(negatives.checks.filter((x:any)=>x.status>=400).length,9);
 for(const check of negatives.checks)assert.equal(check.status,check.expected);
 const before=read('evidence/business-before.json'),after=read('evidence/business-after.json');assert.equal(after.status,'PASS');assert.equal(after.orders,13);assert.deepEqual(after.hashes,before);
});
test('UM-FINDINGS: defects and operational blockers remain open with reproducible evidence and no launch waiver',()=>{
 const findings=read('findings.json');assert.equal(findings.length,7);assert.equal(new Set(findings.map((x:any)=>x.id)).size,7);
 assert.equal(findings.filter((x:any)=>x.kind.startsWith('Reproduced')).length,2);
 for(const f of findings){assert.ok(['OPEN','BLOCKED'].includes(f.status));assert.ok(f.action&&f.acceptance&&f.owner);for(const e of f.evidence)assert.ok(existsSync(base+'evidence/'+e),e);}
 assert.match(readFileSync(base+'evidence/view-technician-_support.txt','utf8'),/does not have permission/);
 assert.match(readFileSync(base+'evidence/view-public-_verify-email.txt','utf8'),/reset link/);
 assert.match(readFileSync(base+'evidence/view-owner-_admin_readiness.txt','utf8'),/NO-GO/);
});
test('UM-ARTIFACTS: delivered files match the fully reviewed artifact versions and preserve genuine screenshots',()=>{
 const validation=read('evidence/artifact-validation.json'),qa=read('evidence/visual-review.json'),content=read('manual-content.json');
 assert.equal(validation.status,'PASS');assert.equal(qa.status,'PASS');assert.equal(content.figures.length,25);
 for(const f of content.figures)assert.ok(existsSync(base+f.source),f.source);
 for(const a of validation.artifacts){assert.ok(existsSync(a.path),a.path);assert.equal(createHash('sha256').update(readFileSync(a.path)).digest('hex'),a.sha256);assert.equal(qa.artifacts.find((x:any)=>x.path===a.path)?.sha256,a.sha256);}
 assert.deepEqual(qa.manualPages,Array.from({length:33},(_,i)=>i+1));assert.deepEqual(qa.auditPages,Array.from({length:13},(_,i)=>i+1));
});
test('UM-MATRIX: all stable documentation requirements and gates keep their evidence and scope limitations',()=>{
 const rtm=JSON.parse(readFileSync('docs/traceability/user-manual-rtm.json','utf8'));
 assert.deepEqual(rtm.requirements.map((r:any)=>r.id),['UM-01','UM-02','UM-03','UM-04']);assert.equal(rtm.coverage.requirements.total,4);assert.equal(rtm.coverage.excluded,0);
 for(const r of rtm.requirements){assert.equal(r.status,'VERIFIED_COMPLETE');for(const f of [...r.implementationFiles,...r.evidence,...r.testFiles])assert.ok(existsSync(f),f);assert.equal(r.testResult,'PASS');assert.ok(r.reason&&r.outstandingWork);}
 assert.equal(rtm.gates.filter((g:any)=>g.status==='PASS').length,4);assert.equal(rtm.coverage.findings.closed,0);assert.equal(rtm.coverage.findings.total,7);assert.match(rtm.productionDecision,/NO-GO/);
});
