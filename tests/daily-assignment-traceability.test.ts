import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
test('DAYASSIGN-MATRIX approved scope has implementation/data/security/executed evidence, preserved baseline failures and passed gates',()=>{
 const j=JSON.parse(readFileSync('docs/traceability/daily-assignment-rtm.json','utf8'));assert.deepEqual(j.requirements.map((r:any)=>r.id),['DAYASSIGN-01','DAYASSIGN-02','DAYASSIGN-03']);
 for(const r of j.requirements){assert.ok(r.authoritativeData.length&&r.securityControls&&r.testIds.length&&r.reason&&r.outstandingWork&&r.uiReference&&r.routes.length);for(const p of [...r.implementationFiles,...r.testFiles,...r.evidence])assert(existsSync(p),p);assert.equal(r.status,'VERIFIED_COMPLETE');assert.equal(j.acceptanceGates.find((g:any)=>g.id===r.acceptanceGate)?.status,'PASS');}
 const b=JSON.parse(readFileSync('docs/daily-assignment/evidence/browser-database.json','utf8'));assert.equal(b.allocationCount,1);assert.equal(b.allocationGrams,12500);assert.equal(b.committedGrams,12500);assert.equal(b.driverMatchesDay,true);assert.equal(b.physicalGramsUnchanged,true);assert.equal(b.auditCount,1);
 const u=JSON.parse(readFileSync('docs/daily-assignment/evidence/browser-verification.json','utf8'));assert.equal(u.modalRemainedOpen,true);assert.equal(u.passwordOrSeparateReservationForm,false);
 const s=JSON.parse(readFileSync('docs/daily-assignment/evidence/deployed-source.json','utf8'));assert.equal(s.files,514);assert.equal(s.allMatch,true);
 const h=JSON.parse(readFileSync('docs/daily-assignment/evidence/stable-verification.json','utf8'));for(const a of ['dispatch.assignToday','order.transition','dispatch.reassign'])assert.equal(h[a].code,401);
 assert.equal(j.coverage.requirements,3);assert.equal(j.coverage.verified,3);assert.equal(j.coverage.excluded,0);assert.equal(j.coverage.broaderDispatchRegression.total,18);assert.equal(j.coverage.broaderDispatchRegression.failed,2);assert.match(j.productionDecision,/NO-GO/);
});
