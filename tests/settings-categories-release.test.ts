import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
const read=async(p:string)=>JSON.parse(await readFile('docs/settings-categories/evidence/'+p,'utf8'));
test('SCAT-DEPLOY: exact reviewed web source, ready demo identity and safe upload boundaries',async()=>{
 const identity=await read('release/candidate-identity.json'),upload=await read('release/upload-verified.json');
 assert.match(identity.sourceCommit,/^[0-9a-f]{40}$/);
 const css=execFileSync('git',['show',identity.sourceCommit+':apps/web/app/globals.css'],{encoding:'utf8',maxBuffer:2e6});assert.ok(css.includes('--sc-demo-space'), 'Deployed source must include banner-aware dialog bounds');assert.equal(identity.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');assert.equal(identity.scope,'onaopemipos-projects');assert.equal(identity.readyState,'READY');assert.equal(identity.target,'production');assert.equal(identity.sourceMetadataConfirmed,true);assert.equal(upload.sourceCommit,identity.sourceCommit);assert.equal(upload.projectId,identity.projectId);assert.equal(upload.files.length,upload.fileCount);
 for(const file of upload.files){assert.doesNotMatch(file.path,/(^|\/)(\.data|\.env[^/]*|docs|tests|scripts|prototypes|node_modules)(\/|$)|^apps\/mobile\//);const source=execFileSync('git',['show',upload.sourceCommit+':'+file.path],{maxBuffer:32*1024*1024});assert.equal(createHash('sha256').update(source).digest('hex'),file.sha256,file.path);}
 for(const path of ['apps/web/components/setting-change-form.tsx','packages/business-rules/src/settings-categories.ts','apps/web/components/settings-purpose-group.tsx'])assert.ok(upload.files.some((f:any)=>f.path===path),path);
});
test('SCAT-HOSTED: candidate and stable six-role API checks pass without changing business state',async()=>{
 const before=await read('release/before-hosted.json'),identity=await read('release/candidate-identity.json');
 for(const stage of ['candidate','stable']){const r=await read('release/'+stage+'-hosted.json');assert.equal(r.sourceCommit,identity.sourceCommit);assert.equal(r.deploymentId,identity.id);assert.equal(r.base,stage==='candidate'?'https://'+identity.url:'https://easygas-client-demo.vercel.app');assert.ok(r.checks.every((c:any)=>c.result==='PASS'));assert.deepEqual(r.snapshot,before.snapshot);assert.equal(r.snapshot.readiness.recommendation,'NO-GO');
  for(const role of ['owner','manager','finance','driver','technician','customer'])assert.ok(r.checks.some((c:any)=>c.name===role+' existing sign-in and own identity'));
  for(const role of ['owner','manager','finance'])assert.ok(r.checks.some((c:any)=>c.name===role+' payment-setting visibility and canonical definitions preserved'));
  for(const role of ['owner','finance'])assert.ok(r.checks.some((c:any)=>c.name===role+' gateway policy readable with protected approvals and sandbox boundary'));
  for(const role of ['driver','technician','customer'])assert.ok(r.checks.some((c:any)=>c.name===role+' denied governed settings'));
  for(const role of ['finance','driver','technician','customer'])assert.ok(r.checks.some((c:any)=>c.name===role+' denied staff lookup'));
  assert.ok(r.checks.some((c:any)=>c.name==='Missing, malformed, ambiguous and forged lookup inputs rejected'));
  assert.ok(r.checks.some((c:any)=>c.name==='Post-check settings, approvals, staff, orders, inventory, ledger, policies and NO-GO gates unchanged'));
 }
 const browser=await read('release/stable-browser.json');assert.equal(browser.base,'https://easygas-client-demo.vercel.app/admin/settings');assert.ok(browser.checks.every((c:any)=>c.result==='PASS'));
});
test('SCAT-NO-MOBILE-BUILD: original native artifacts retained byte-for-byte with original modification times',async()=>{
 const before=await read('native-artifacts-before.json'),after=await read('native-artifacts-after.json');assert.equal(after.unchanged,true);assert.deepEqual(after.artifacts,before.artifacts);assert.equal(Object.keys(before.artifacts).length,4);
 const identity=await read('release/candidate-identity.json');const changed=execFileSync('git',['diff','--name-only','19755cc272463edd1ef9bc90485a64f4ea603152',identity.sourceCommit],{encoding:'utf8'});assert.doesNotMatch(changed,/^apps\/mobile\//m);
});
