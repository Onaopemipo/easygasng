import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
test('HOME-MATRIX all approved requirements retain implementation, authoritative data, security, executed evidence and passed gates',()=>{
 const j=JSON.parse(readFileSync('docs/traceability/home-continuity-rtm.json','utf8'));
 assert.deepEqual(j.requirements.map((r:any)=>r.id),['HOMEKEEP-01','HOMEKEEP-02','HOMEKEEP-03']);
 for(const r of j.requirements){
  assert.ok(r.authoritativeData.length && r.securityControls && r.reason && r.outstandingWork && r.routes.length && r.uiReference);
  for(const p of [...r.implementationFiles,...r.testFiles,...r.evidence])assert.ok(existsSync(p),p);
  assert.equal(r.status,'VERIFIED_COMPLETE');
  assert.equal(j.acceptanceGates.find((g:any)=>g.id===r.acceptanceGate)?.status,'PASS');
 }
 const b=JSON.parse(readFileSync('docs/home-continuity/evidence/browser-verification.json','utf8'));
 assert.deepEqual(b.transition,{retained:1,loader:false,home:true,prices:true});
 assert.equal(b.fresh.retained,0);assert.equal(b.fresh.loader,false);assert.equal(b.fresh.errors.length,0);
 const s=JSON.parse(readFileSync('docs/home-continuity/evidence/deployed-source.json','utf8'));assert.equal(s.files,514);assert.equal(s.allMatch,true);
 const h=JSON.parse(readFileSync('docs/home-continuity/evidence/stable-verification.json','utf8'));assert.equal(h.unauthenticatedCheckout.status,401);
 assert.equal(j.coverage.requirements,3);assert.equal(j.coverage.verified,3);assert.equal(j.coverage.excluded,0);assert.match(j.productionDecision,/NO-GO/);
});
