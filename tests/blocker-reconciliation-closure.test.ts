import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root='docs/blocker-reconciliation/evidence/';
const json=async(name:string)=>JSON.parse(await readFile(root+name,'utf8'));
test('PBR21-ARTIFACTS: exact committed upload, Ready promotion and current successful CI bind to the same source',async()=>{
 const [source,candidate,stable,jobs,stats]=await Promise.all(['source-integrity.json','candidate-identity.json','stable-identity.json','ci-final-jobs.json','ci-test-summary.json'].map(json));
 assert.equal(source.fileCount,436);assert.equal(source.files.length,436);assert.equal(candidate.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');assert.equal(candidate.readyState,'READY');assert.equal(stable.id,candidate.id);assert.equal(stable.readyState,'READY');assert.equal(stable.stableAlias,'https://easygas-client-demo.vercel.app');assert.equal(stable.sourceCommit,source.sourceCommit);assert.equal(candidate.sourceCommit,source.sourceCommit);assert.equal(jobs.sourceCommit,source.sourceCommit);assert.equal(stats.sourceCommit,source.sourceCommit);
 assert.equal(jobs.jobs.length,2);assert.ok(jobs.jobs.every((j:any)=>j.conclusion==='success'));assert.equal(stats.failed,0);assert.equal(stats.skipped,0);assert.ok(stats.passed>=1148);assert.equal(stats.passed,stats.total);assert.ok(jobs.jobs.find((j:any)=>j.name==='native').steps.some((s:any)=>s.name.includes('expo export')&&s.conclusion==='skipped'));
 for(const f of source.files){assert.doesNotMatch(f.path,/^(apps\/mobile|docs|tests|scripts|outputs|prototypes|\.data|\.github)(\/|$)/);const b=execFileSync('git',['show',source.sourceCommit+':'+f.path],{maxBuffer:32*1024*1024});assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);assert.equal(createHash('sha256').update(await readFile(f.path)).digest('hex'),f.sha256);}
});
test('PBR21-DISPOSITIONS: all nine original high incidents, the evidence supplement and all12 retained records have verified scoped readback',async()=>{
 const [before,dispositions,final]=await Promise.all(['incidents-before.json','incident-dispositions.json','final-hosted.json'].map(json));
 assert.equal(before.incidents.length,9);assert.equal(dispositions.status,'PASS');assert.equal(dispositions.results.length,10);assert.equal(dispositions.sessionRevoked,true);for(const k of ['financialWrites','stockWrites','qualificationWrites'])assert.equal(dispositions[k],0);
 const nine=before.incidents.map((i:any)=>dispositions.results.find((r:any)=>r.id===i.id));assert.ok(nine.every((r:any)=>r&&r.originalDetailRetained&&r.noteRecorded));assert.equal(nine.filter((r:any)=>r.status==='resolved').length,6);assert.equal(nine.filter((r:any)=>r.status==='acknowledged').length,3);
 assert.equal(final.status,'PASS');assert.equal(final.checks.length,17);assert.equal(final.incidents.length,12);assert.equal(final.readiness.recommendation,'NO-GO');assert.match(final.readiness.gates.find((g:any)=>g.id===17).evidence,/3 unresolved/);assert.equal(final.incidents.filter((i:any)=>i.status==='open').length,1);assert.ok(final.sessionsRevoked.every((s:any)=>s.status===200));
 const baseline=await json('before-hosted.json');assert.deepEqual(final.snapshot,baseline.snapshot);
 for(const stage of ['candidate','stable']){const r=await json(stage+'-hosted.json');assert.equal(r.status,'PASS');assert.equal(r.checks.length,15);assert.deepEqual(r.snapshot,baseline.snapshot);assert.equal(r.sessionsRevoked.length,7);assert.ok(r.sessionsRevoked.every((s:any)=>s.status===200));}
});
test('PBR21-CLOSURE: final UI clears the notice and retains native artifacts, original source proofs and production holds',async()=>{
 const ui=await json('browser-observations.json');assert.equal(ui.status,'PASS');assert.equal(ui.observations.length,6);assert.ok(ui.observations.every((o:any)=>o.status==='PASS'));assert.equal(ui.signedOut,true);assert.equal(ui.viewportReset,true);assert.deepEqual(ui.consoleErrors,[]);
 for(const o of ui.observations){assert.equal((await readFile(o.screenshot)).subarray(0,3).toString('hex'),'ffd8ff');if(o.geometry?.noticeTop){assert.ok(o.geometry.dialogBottom<o.geometry.noticeTop);assert.equal(o.geometry.documentWidth,o.geometry.viewportWidth);}}
 const native=await json('native-preservation.json');assert.equal(native.newMobileBuilds,0);assert.equal(native.mobileExports,0);assert.equal(native.installs,0);assert.equal(native.artifacts.length,3);
 const matrix=JSON.parse(await readFile('docs/traceability/native-workflows-rtm.json','utf8'));assert.equal(matrix.featureDenominator,300);assert.equal(matrix.gates.find((g:any)=>g.id==='NATIVE-G06').status,'BLOCKED');assert.match(matrix.productionDecision,/NO-GO/);
 for(const file of ['prototypes/easygas-mobile/source-manifest.json','prototypes/easygas-mobile/dist/app.js','prototypes/easygas-experience/source-manifest.json']){assert.deepEqual(await readFile(file),execFileSync('git',['show','ce3d915:'+file],{maxBuffer:32*1024*1024}));}
});
