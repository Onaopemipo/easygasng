/** Pinned synthetic client-demo checks. Only own sign-in/sign-out; no assignment or other business write. */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const exec=promisify(execFile), stage=process.argv[2];
assert.ok(['before','candidate','stable'].includes(stage));
const origin='https://easygas-client-demo.vercel.app', baseDir='.data/driver-assignment/';
await fs.mkdir(baseDir,{recursive:true});
const state=stage==='candidate'?JSON.parse(await fs.readFile(baseDir+'state.json','utf8')):null;
if(state)assert.equal(state.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const base=state?state.candidateUrl:origin;
if(state)assert.match(base,/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/);
const tokens={},checks=[],result={stage,base,businessWrites:0,checks};
async function transport(route,opts){
 if(!state)return fetch(base+route,{...opts,signal:AbortSignal.timeout(30000)});
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-assignment-qa-'));
 try{
  const output=path.join(temp,'response'),config=path.join(temp,'curl.cfg');
  const lines=['silent','show-error','output = '+JSON.stringify(output),'write-out = "%{http_code}"','request = '+JSON.stringify(opts.method),'max-time = 30'];
  for(const[k,v]of Object.entries(opts.headers))lines.push('header = '+JSON.stringify(k+': '+v));
  if(opts.body){const body=path.join(temp,'request');await fs.writeFile(body,opts.body,{mode:0o600});lines.push('data-binary = '+JSON.stringify('@'+body))}
  await fs.writeFile(config,lines.join('\n')+'\n',{mode:0o600});
  const r=await exec('vercel',['curl',route,'--deployment',base,'--scope','onaopemipos-projects','--','--config',config],{timeout:60000,maxBuffer:200000});
  const status=Number(r.stdout.trim().match(/(\d{3})$/)?.[1]);assert.ok(status);
  const content=await fs.readFile(output,'utf8');
  return {status,json:async()=>JSON.parse(content)};
 }finally{await fs.rm(temp,{recursive:true,force:true})}
}
async function call(role,action,data){
 const r=await transport('/api/'+action,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});
 return {status:r.status,body:await r.json()};
}
const ok=async(role,action,data)=>{const r=await call(role,action,data);assert.equal(r.status,200,role+' '+action);return r.body};
const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name)};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['checkedAt','asOf','generatedAt','observedAt','serverTime'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
try{
 const staff=(await fs.readFile('.data/demo-staff-logins-qa-ac7e0495.md','utf8')).split('\n').filter(x=>x.startsWith('|')&&x.includes('@')).map(x=>x.split('|').map(x=>x.trim().replaceAll('`','')));
 const accounts=JSON.parse(await fs.readFile('.data/demo-test-logins-20261110.json','utf8')).accounts;
 for(const[role,label]of [['owner','Admin / Business Owner'],['manager','Branch Manager / Sales Rep / Dispatcher / Service Manager'],['finance','Finance / Auditor / Inventory'],['driver','Delivery Driver'],['technician','Service Technician'],['customer',null],['commercial',null]]){
  const row=label?staff.find(x=>x[1]===label):null;const c=row?{email:row[2],password:row[3]}:accounts.find(x=>x.role===role);assert.ok(c);
  const r=await ok('',role==='driver'||role==='technician'?role+'.login':'login',{email:c.email,password:c.password});assert.equal(r.role,role);tokens[role]=r.token;assert.ok(tokens[role]);
 }
 pass('Seven existing labelled QA identities authenticated without changing authority');
 const orders=await ok('owner','orders');
 const selectionFile=baseDir+'selection.json';let selection;
 try{selection=JSON.parse(await fs.readFile(selectionFile,'utf8'))}catch{
  const eligible=orders.filter(o=>o.status==='preparing');
  const selected=eligible.find(o=>/demo|synthetic/i.test(o.customer_name??''))??eligible[0];assert.ok(selected,'Existing preparing order required; do not create or prepare one');
  selection={orderId:selected.id,reference:selected.reference};await fs.writeFile(selectionFile,JSON.stringify(selection,null,2)+'\n',{mode:0o600});
 }
 const order=orders.find(o=>o.id===selection.orderId);assert.equal(order?.status,'preparing');
 result.selection=selection;
 async function snapshot(){
  const o=(await ok('owner','orders?id='+selection.orderId))[0];
  const fleet=await ok('owner','fleet.summary');
  return {order:hash({id:o.id,status:o.status,driver_id:o.driver_id,tracking_version:o.tracking_version,attempt:o.attempt,items:o.items,gasLines:o.gasLines}),inventory:hash(await ok('owner','inventory')),fleet:hash({vehicles:fleet.vehicles,trips:fleet.trips.map(t=>({id:t.id,driver_id:t.driver_id,vehicle_id:t.vehicle_id,branch_id:t.branch_id,ended_at:t.ended_at}))})};
 }
 const before=await snapshot();
 const owner=await ok('owner','dispatch.candidates?orderId='+selection.orderId);
 assert.equal(owner.orderId,selection.orderId);assert.ok(owner.candidates.length);assert.equal(owner.automaticAssignmentEnabled,false);
 const manager=await ok('manager','dispatch.candidates?orderId='+selection.orderId);
 if(stage!=='before'){
  assert.equal(owner.canReviewVehicles,true);assert.equal(manager.canReviewVehicles,false);assert.ok(owner.branch.name);assert.ok(owner.checkedAt);
  const known=['DRIVER_ALREADY_ASSIGNED','DRIVER_INACTIVE','DRIVER_UNAVAILABLE','DRIVER_TRIP_REQUIRED','TRIP_BRANCH_MISMATCH','VEHICLE_INACTIVE','VEHICLE_LPG_UNVERIFIED','VEHICLE_BRANCH_MISMATCH','VEHICLE_CAPACITY_EXCEEDED','INVALID_REQUEST'];
  for(const d of owner.candidates){assert.ok(Array.isArray(d.readiness.issues));if(d.readiness.ready===false)assert.ok(d.readiness.issues.length);for(const i of d.readiness.issues){assert.ok(known.includes(i.code));assert.ok(i.title&&i.resolution&&i.responsible);assert.ok(!i.title.includes('Driver needs an active suitable vehicle trip'));}}
  assert.ok(owner.candidates.some(d=>d.readiness.issues.some(i=>i.code==='DRIVER_TRIP_REQUIRED')),'Existing no-trip exception must remain visible');
  result.requirements=owner.candidates.map(d=>({driverId:d.id,ready:d.readiness.ready,issues:d.readiness.issues}));
  pass('Exact current requirements, responsible roles and resolutions returned; generic fleet message removed');
  pass('Owner vehicle-review link capability and manager boundary preserved');
 }
 for(const role of ['finance','driver','technician','customer','commercial'])assert.equal((await call(role,'dispatch.candidates?orderId='+selection.orderId)).status,403);
 assert.equal((await call('','dispatch.candidates?orderId='+selection.orderId)).status,401);
 pass('Five non-dispatch roles denied; anonymous access denied');
 assert.equal((await call('owner','dispatch.candidates?orderId=not-a-uuid')).status,400);
 pass('Invalid order reference rejected');
 const after=await snapshot();assert.deepEqual(after,before);result.before=before;result.after=after;
 pass('Readiness refresh leaves order version, assignment, attempts, inventory, vehicles and trips unchanged');
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1}
finally{
 result.sessionsRevoked=[];
 for(const role of Object.keys(tokens)){try{result.sessionsRevoked.push({role,status:(await call(role,'logout',{})).status})}catch{result.sessionsRevoked.push({role,status:'FAILED'})}}
 if(!result.sessionsRevoked.every(r=>r.status===200)){result.status='FAIL';result.failure='Own QA session cleanup not confirmed';process.exitCode=1}
 result.completedAt=new Date().toISOString();await fs.writeFile('docs/driver-assignment/evidence/'+stage+'-hosted.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({stage,status:result.status,checks:checks.length,sessions:result.sessionsRevoked.length}));if(result.failure)console.error(result.failure);
}
