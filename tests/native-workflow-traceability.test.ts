import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const json=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
test('NATIVE-RTM-DENOMINATORS: original 36 families, 300 stable features and 14 external blocks stay in scope',async()=>{
 const matrix=await json('docs/traceability/native-workflows-rtm.json'),leaves=await json('docs/native-workflows/feature-acceptance.json'),prior=await json('docs/mobile-acceptance/feature-acceptance.json');
 assert.equal(matrix.requirements.length,36);assert.equal(leaves.length,300);assert.deepEqual(leaves.map((r:any)=>r.id),prior.map((r:any)=>r.id));assert.equal(new Set(leaves.map((r:any)=>r.id)).size,300);
 assert.equal(leaves.filter((r:any)=>r.externalAcceptance).length,14);assert.ok(leaves.filter((r:any)=>r.externalAcceptance).every((r:any)=>r.status==='BLOCKED'));assert.ok(leaves.every((r:any)=>r.status!=='VERIFIED_COMPLETE'));
 assert.match(matrix.productionDecision,/NO-GO.*actual-import hold.*retain-all/);assert.equal(matrix.coverage.excluded,0);assert.equal(matrix.gates.length,6);assert.equal(matrix.gates.find((g:any)=>g.id==='NATIVE-G06').status,'BLOCKED');
 for(const row of matrix.requirements)for(const path of [...row.implementationFiles,...row.testFiles,...row.evidence])await access(path);
});
test('NATIVE-RTM-EVIDENCE: six installed iOS personas and real component checks remain distinct from device/provider certification',async()=>{
 const obs=await json('docs/native-workflows/evidence/simulator-observations.json'),component=await json('docs/native-workflows/evidence/component-tests.json');
 assert.deepEqual(obs.roles.map((r:any)=>r.role).sort(),['owner','manager','finance','driver','technician','customer'].sort());
 for(const role of obs.roles)for(const screenshot of role.screenshots){const png=await readFile('docs/native-workflows/evidence/'+screenshot+'.jpg');assert.deepEqual([...png.subarray(0,3)],[255,216,255]);}
 assert.equal(component.checks.filter((c:any)=>c.id.startsWith('NATIVE-COMPONENT-')&&c.result==='PASS').length,9);assert.equal(component.checks.find((c:any)=>c.id==='NATIVE-PORT-FORM-COUNT').forms,97);
 const readback=await json('docs/native-workflows/evidence/simulator-api-readback.json');assert.equal(readback.credit.amountKobo,8025);assert.equal(readback.credit.status,'pending');assert.equal(readback.technician.assignment,'acknowledged');assert.equal(readback.driver.assignment[0].decision,'acknowledged');assert.equal(readback.driver.attempt.pickedUpAt,null);
});
test('NATIVE-RTM-SOURCE: native build record and later logo continuation retain original artifact proofs',async()=>{
 const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex'),build=await json('docs/native-workflows/evidence/build-manifest.json'),review=await json('docs/native-workflows/reviewed-source-changes.json');
 const logo=await json('docs/mobile-transparent-logo/reviewed-source-changes.json'),textFix=await json('docs/mobile-orders-text-fix/reviewed-source-changes.json'),authority=await json('docs/native-order-authority/reviewed-source-changes.json'),device=await json('docs/mobile-device-acceptance/reviewed-source-changes.json');
 for(const[path,hash]of Object.entries(device.baseline)){assert.equal(sha(execFileSync('git',['show',device.baseCommit+':'+path])),hash,path+' before device fixes');assert.equal(sha(await readFile(path)),device.files[path],path+' device fixes');}
 for(const[path,hash]of Object.entries(authority.baseline)){assert.equal(sha(execFileSync('git',['show',authority.baseCommit+':'+path])),hash,path+' before authority repair');assert.equal(sha(await readFile(path)),device.files[path]??authority.files[path],path+' authority repair');}
 for(const[path,hash]of Object.entries(authority.addedFiles))assert.equal(sha(await readFile(path)),hash,path+' added authority surface');
 for(const[path,hash]of Object.entries(textFix.baseline)){assert.equal(sha(execFileSync('git',['show',textFix.baseCommit+':'+path])),hash,path+' pre-text-fix commit baseline');assert.equal(sha(await readFile(path)),device.files[path]??authority.files[path]??textFix.files[path],path+' text-only continuation');}
 for(const [path,hash] of Object.entries(logo.baseline)){assert.equal(sha(execFileSync('git',['show',logo.baseCommit+':'+path])),hash,path+' pre-logo commit baseline');if(textFix.files[path])assert.equal(textFix.baseline[path],logo.files[path],path+' logo before text-only fix');assert.equal(sha(await readFile(path)),device.files[path]??authority.files[path]??textFix.files[path]??logo.files[path],path+' transparent-logo continuation');}
 for(const[path,hash]of Object.entries(build.sourceSha256)){if(logo.files[path])assert.equal(logo.baseline[path],hash,path+' original build retained');if(textFix.files[path])assert.equal(textFix.baseline[path],logo.files[path]??hash,path+' before text-only fix');assert.equal(sha(await readFile(path)),device.files[path]??authority.files[path]??textFix.files[path]??logo.files[path]??hash,path);}
 for(const[path,hash]of Object.entries(review.files)){if(logo.files[path])assert.equal(logo.baseline[path],hash,path+' original review retained');if(textFix.files[path])assert.equal(textFix.baseline[path],logo.files[path]??hash,path+' before text-only fix');assert.equal(sha(await readFile(path)),device.files[path]??authority.files[path]??textFix.files[path]??logo.files[path]??hash,path);}
 for(const[path,hash]of Object.entries(logo.addedFiles))assert.equal(sha(await readFile(path)),hash,path);
 assert.equal(sha(await readFile('prototypes/easygas-mobile/source-manifest.json')),review.prototypeManifestSha256);assert.equal(sha(await readFile('prototypes/easygas-mobile/dist/app.js')),review.prototypeBundleSha256);
 assert.match(build.distribution,/not a client-demo cloud or signed physical-device/);
});
