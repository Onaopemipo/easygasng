// Exact-source fleet release probe. Business snapshots and denied unverified/nonowner registration only.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
const exec=promisify(execFile),stage=process.argv[2];assert.ok(['candidate','stable'].includes(stage));
const release=JSON.parse(await fs.readFile('.data/fleet-verification/release.json','utf8'));
assert.equal(release.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const state=JSON.parse(await fs.readFile('.data/fleet-verification/state.json','utf8'));
const origin='https://easygas-client-demo.vercel.app',base=stage==='candidate'?release.candidateUrl:origin;
assert.match(release.candidateUrl,/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/);
async function call(role,action,body){
 const opts={method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-easygas-client':'native',...(state.tokens[role]?{authorization:'Bearer '+state.tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})};
 if(stage==='stable'){const r=await fetch(base+'/api/'+action,{...opts,signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json()};}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-fleet-probe-'));
 try{
  const output=path.join(dir,'response'),config=path.join(dir,'curl.cfg');const lines=['silent','show-error','max-time = 30','request = '+JSON.stringify(opts.method),'output = '+JSON.stringify(output),'write-out = "%{http_code}"'];
  for(const[k,v]of Object.entries(opts.headers))lines.push('header = '+JSON.stringify(k+': '+v));
  if(opts.body){const input=path.join(dir,'request');await fs.writeFile(input,opts.body,{mode:0o600});lines.push('data-binary = '+JSON.stringify('@'+input));}
  await fs.writeFile(config,lines.join('\n')+'\n',{mode:0o600});const r=await exec('vercel',['curl','/api/'+action,'--deployment',base,'--scope','onaopemipos-projects','--','--config',config],{timeout:60000,maxBuffer:200000});
  return{status:Number(r.stdout.trim().match(/(\d{3})$/)?.[1]),data:JSON.parse(await fs.readFile(output,'utf8'))};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
const ok=async(role,a,b)=>{const r=await call(role,a,b);assert.equal(r.status,200,role+' '+a);return r.data;};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const checks=[];const pass=id=>{checks.push({id,status:'PASS'});console.log('PASS '+id);};
const before={orders:hash(await ok('owner','orders')),inventory:hash(await ok('owner','inventory')),ledger:hash(await ok('owner','finance.ledger?limit=500')),fleet:hash(await ok('owner','fleet.summary'))};
assert.deepEqual(await ok('','status'),{status:'ready',scope:'demo'});pass('FVERIFY-RELEASE-STATUS');
const body={branchId:'lagos',label:'DEMO-QA-FLEET-RELEASE-DENIAL',capacityGrams:2000,lpgSuitable:false,operationKey:randomUUID()};const denied=[];
for(const role of ['owner','dispatcher','driver']){const r=await call(role,'fleet.vehicle.create',body);assert.equal(r.status,403,role);if(role==='owner')assert.equal(r.data.code,'REAUTH_REQUIRED');denied.push({role,status:r.status,code:r.data.code});}assert.equal((await call('','fleet.summary')).status,401);pass('FVERIFY-RELEASE-GUARDS');
const after={orders:hash(await ok('owner','orders')),inventory:hash(await ok('owner','inventory')),ledger:hash(await ok('owner','finance.ledger?limit=500')),fleet:hash(await ok('owner','fleet.summary'))};assert.deepEqual(after,before);pass('FVERIFY-RELEASE-PRESERVATION');
await fs.writeFile('docs/fleet-verification/evidence/'+stage+'-release.json',JSON.stringify({status:'PASS',stage,base,sourceCommit:release.sourceCommit,deploymentId:release.deploymentId,checks,denied,before,after},null,2)+'\n');
