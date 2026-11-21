// Normal authenticated QA APIs only. Never writes business records or safety evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const exec=promisify(execFile),stage=process.argv[2];assert.ok(['preflight','candidate','candidate-focus','stable','preservation','cleanup'].includes(stage));
const root='.data/sensitive-action-verification',evidence='docs/sensitive-action-verification/evidence',origin='https://easygas-client-demo.vercel.app';
const credentials=JSON.parse(await fs.readFile('.data/demo-test-logins-20261110.json','utf8')).accounts;
let state;try{state=JSON.parse(await fs.readFile(root+'/state.json','utf8'));}catch{state={tokens:{},actors:{}};}
const save=()=>fs.writeFile(root+'/state.json',JSON.stringify(state,null,2)+'\n',{mode:0o600});
const release=JSON.parse(await fs.readFile(root+'/release.json','utf8'));assert.equal(release.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const base=stage.startsWith('candidate')?release.candidateUrl:origin;
if(stage.startsWith('candidate'))assert.match(base,/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/);
async function call(role,action,body,extra={},overrideToken){
 const token=overrideToken??state.tokens[role];
 const opts={method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-easygas-client':'native',...(token?{authorization:'Bearer '+token}:{}),...extra},...(body===undefined?{}:{body:JSON.stringify(body)})};
 if(!stage.startsWith('candidate')){const r=await fetch(base+'/api/'+action,{...opts,signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json()};}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-sensitive-probe-'));
 try{
  const output=path.join(dir,'response'),config=path.join(dir,'curl.cfg');const lines=['silent','show-error','max-time = 30','request = '+JSON.stringify(opts.method),'output = '+JSON.stringify(output),'write-out = "%{http_code}"'];
  for(const[k,v]of Object.entries(opts.headers))lines.push('header = '+JSON.stringify(k+': '+v));
  if(opts.body){const input=path.join(dir,'request');await fs.writeFile(input,opts.body,{mode:0o600});lines.push('data-binary = '+JSON.stringify('@'+input));}
  await fs.writeFile(config,lines.join('\n')+'\n',{mode:0o600});const r=await exec('vercel',['curl','/api/'+action,'--deployment',base,'--scope','onaopemipos-projects','--','--config',config],{timeout:60000,maxBuffer:200000});
  return{status:Number(r.stdout.trim().match(/(\d{3})$/)?.[1]),data:JSON.parse(await fs.readFile(output,'utf8'))};
 }finally{await fs.rm(dir,{recursive:true,force:true});}
}
const ok=async(role,a,b,headers)=>{const r=await call(role,a,b,headers);assert.equal(r.status,200,role+' '+a);return r.data;};
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const snapshot=async()=>({orders:hash(await ok('owner','orders')),inventory:hash(await ok('owner','inventory')),ledger:hash(await ok('owner','finance.ledger?limit=500')),fleet:hash(await ok('owner','fleet.summary'))});
if(stage==='preflight'){
 for(const account of credentials){
  const r=await call('', 'login',{identifier:account.email,password:account.password});assert.equal(r.status,200,account.role+' login');assert.ok(r.data.token);state.tokens[account.role]=r.data.token;await save();
  const me=await ok(account.role,'me');state.actors[account.role]={id:me.user.id,role:me.user.role,branchId:me.user.branchId};await save();
 }
 state.before=await snapshot();await save();
 await fs.writeFile(evidence+'/preflight.json',JSON.stringify({status:'PASS',identities:credentials.length,canonicalRoles:[...new Set(Object.values(state.actors).map(a=>a.role))].sort(),before:state.before},null,2)+'\n');console.log('PASS preflight: '+credentials.length+' normal QA identities; baseline captured');
}else if(stage==='preservation'){
 const after=await snapshot();assert.deepEqual(after,state.before);await fs.writeFile(evidence+'/final-preservation.json',JSON.stringify({status:'PASS',sourceCommit:release.sourceCommit,before:state.before,after},null,2)+'\n');console.log('PASS final business preservation');
}else if(stage==='cleanup'){
 const checks=[];
 for(const role of Object.keys(state.tokens)){await ok(role,'logout',{});assert.equal((await call(role,'me')).status,401);delete state.tokens[role];await save();checks.push({role,revoked:true,meStatus:401});}
 await fs.writeFile(evidence+'/session-cleanup.json',JSON.stringify({status:'PASS',checks},null,2)+'\n');console.log('PASS revoked '+checks.length+' own API sessions');
}else{
 const checks=[],pass=(id,detail)=>{checks.push({id,status:'PASS',...detail});console.log('PASS '+id);};
 assert.deepEqual(await ok('','status'),{status:'ready',scope:'demo'});pass('SVERIFY-HOST-STATUS');
 const before=await snapshot();assert.deepEqual(before,state.before);
 for(const account of (stage==='candidate-focus'?credentials.filter(a=>['owner','driver'].includes(a.role)):credentials)){
  const label=account.role,actor=state.actors[label],owner=actor.role==='owner',manager=actor.role==='manager';
  const me=await ok(label,'me'),context=me.verificationContext;assert.equal(context,createHash('sha256').update('verification:'+state.tokens[label]).digest('hex'));
  const denied=[];
  for(const action of ['fleet.vehicle.create','branch.create','staff.edit','readiness.review']){
   const r=await call(label,action,{operationKey:randomUUID()});assert.equal(r.status,403,label+' unverified '+action);if(owner||(manager&&action==='staff.edit'))assert.equal(r.data.code,'REAUTH_REQUIRED',label+' '+action);
   if(r.data.code==='REAUTH_REQUIRED')assert.equal(r.data.verificationContext,context);denied.push({action,status:r.status,code:r.data.code});
  }
  const wrong=await call(label,'reauth',{password:'incorrect-synthetic-qa-password'});assert.equal(wrong.status,403);assert.equal(wrong.data.code,'REAUTH_INVALID');
  await ok(label,'reauth',{password:account.password});
  for(const action of ['fleet.vehicle.create','branch.create','staff.edit','readiness.review']){
   const r=await call(label,action,{operationKey:randomUUID()},{'x-easygas-verification-context':context});const allowed=owner||(manager&&action==='staff.edit');assert.equal(r.status,allowed?400:403,label+' verified '+action);assert.notEqual(r.data.code,'REAUTH_REQUIRED');
  }
  const swapped=await call(label,'fleet.vehicle.create',{operationKey:randomUUID()},{'x-easygas-verification-context':'wrong-session-context'});assert.equal(swapped.status,409);assert.equal(swapped.data.code,'VERIFICATION_CONTEXT_CHANGED');
  assert.equal((await call('', 'me',undefined,{},context)).status,401,'comparison context is not a bearer credential');
  if(actor.role==='finance'){
   const r=await call(label,'gas.stock.receive',{branchId:'synthetic-other-branch',grams:100,reference:'SVERIFY-SYNTHETIC-DENIAL',reason:'Synthetic QA only'});assert.equal(r.status,403);assert.equal(r.data.code,'BRANCH_FORBIDDEN');
  }
  if(owner){
   const r=await call(label,'staff.privileges?userId='+state.actors.driver.id,undefined,{'x-easygas-verification-context':context});assert.equal(r.status,200,'verified owner protected read');
  }
  // Restore an unverified session without changing any server verification timestamp.
  await ok(label,'logout',{});delete state.tokens[label];await save();
  const r=await call('','login',{identifier:account.email,password:account.password});assert.equal(r.status,200);state.tokens[label]=r.data.token;await save();
  pass('SVERIFY-HOST-'+label.toUpperCase(),{canonicalRole:actor.role,unverifiedDenials:denied,wrongPassword:403,correctPassword:200,malformedOrForbiddenAfterVerification:true,sessionMismatch:409,markerNotCredential:401});
 }
 assert.equal((await call('','fleet.summary')).status,401);pass('SVERIFY-HOST-ANONYMOUS');
 const after=await snapshot();assert.deepEqual(after,before);assert.deepEqual(after,state.before);pass('SVERIFY-HOST-PRESERVATION');
 await fs.writeFile(evidence+'/'+stage+'-release.json',JSON.stringify({status:'PASS',stage,sourceCommit:release.sourceCommit,deploymentId:release.deploymentId,base,checks,identities:stage==='candidate-focus'?2:credentials.length,canonicalRoles:stage==='candidate-focus'?['driver','owner']:[...new Set(Object.values(state.actors).map(a=>a.role))].sort(),before,after,limits:'No successful business writes, operational safety renewals, role changes or production authorisation. Password/session security checks only.'},null,2)+'\n');
}
