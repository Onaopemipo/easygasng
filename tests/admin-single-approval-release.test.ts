import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const read=async(p:string)=>JSON.parse(await readFile(p,'utf8'));
test('ASA-RELEASE: exact pushed source, four retained database guards, Ready deployment and single Admin audit proof bind to the demo',async()=>{
 const base='docs/admin-single-approval/evidence/';
 const release=await read(base+'release-source.json'),dry=await read(base+'final-dry-run.json'),uploaded=await read(base+'uploaded-source-files.json'),stable=await read(base+'stable-identity.json');
 assert.equal(release.status,'PASS');assert.equal(release.expectedSourceFiles,493);assert.equal(release.allUploadedSha1Match,true);assert.equal(release.allCommittedSourceSha1Match,true);assert.equal(release.nativeBuild,false);
 assert.equal(stable.id,release.deploymentId);assert.equal(stable.readyState,'READY');const alias=await read(base+'stable-alias.json');assert.equal(alias.alias,'easygas-client-demo.vercel.app');assert.equal(alias.deployment.id,release.deploymentId);
 assert.equal(dry.files.length,493);assert.equal(Object.keys(uploaded).length,493);
 for(const f of dry.files){assert.equal(uploaded[f.path],f.sha,f.path);const bytes=execFileSync('git',['show',release.sourceCommit+':'+f.path],{maxBuffer:16*1024*1024});assert.equal(createHash('sha1').update(bytes).digest('hex'),f.sha,f.path);}
 const guards=execFileSync('git',['show',release.sourceCommit+':release-schema-check.ts']).toString();
 const config=JSON.parse(execFileSync('git',['show',release.sourceCommit+':vercel.json']).toString());assert(config.buildCommand.length<=256);assert(config.buildCommand.includes('release-schema-check.ts'));
 for(const name of ['same-visit','phone-order','default-user-branch','admin-single-approval'])assert(guards.includes('./'+name+'-schema-check.ts'),name);
 const log=await readFile(base+'hosted-build.txt','utf8');for(const phrase of ['schema082','schema083','schema084','schema085','Compiled successfully','Deployment completed'])assert(log.includes(phrase),phrase);
 const candidate=await read(base+'candidate-hosted.json'),current=await read(base+'stable-hosted.json');for(const proof of [candidate,current]){assert.equal(proof.status,'PASS');assert.equal(proof.deploymentId,release.deploymentId);assert.equal(proof.sessionsRevoked,3);assert.equal(proof.customerAndRewardsPreserved,true);assert.equal(proof.codEnabled,false);assert.equal(proof.oneAdminAcceptance.valueUnchanged,true);assert.equal(proof.oneAdminAcceptance.adminAuditProofs,1);assert.equal(proof.oneAdminAcceptance.additionalColleagueApprovals,0);}
 assert.equal(candidate.businessWrites,1);assert.equal(current.businessWrites,0);assert.equal(candidate.oneAdminAcceptance.requestId,current.oneAdminAcceptance.requestId);
});
