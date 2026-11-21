// Exact-source candidate/stable probe. Read-only business snapshots; duplicate-start negative only.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID,createHash} from 'node:crypto';
const exec=promisify(execFile),stage=process.argv[2];assert.ok(['candidate','stable'].includes(stage));
const release=JSON.parse(await fs.readFile('.data/role-order-acceptance-20261121/release.json','utf8'));
assert.equal(release.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const state=JSON.parse(await fs.readFile('.data/role-order-acceptance-20261121/state.json','utf8'));
const origin='https://easygas-client-demo.vercel.app',base=stage==='candidate'?release.candidateUrl:origin;
assert.match(release.candidateUrl,/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/);
async function call(role,action,body){
 const opts={method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-easygas-client':'native',...(state.tokens[role]?{authorization:'Bearer '+state.tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})};
 if(stage==='stable'){const r=await fetch(base+'/api/'+action,{...opts,signal:AbortSignal.timeout(30000)});return{status:r.status,data:await r.json()};}
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-role-order-probe-'));
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
const checks=[],result={stage,base,sourceCommit:release.sourceCommit,deploymentId:release.deploymentId,businessWrites:0,checks};
const pass=name=>{checks.push({name,status:'PASS'});console.log('PASS '+name);};
async function snapshot(){return{orders:hash(await ok('owner','orders')),inventory:hash(await ok('inventory','inventory')),ledger:hash(await ok('finance','finance.ledger')),trips:hash((await ok('owner','fleet.summary')).trips.map(t=>({id:t.id,driver:t.driver_id,vehicle:t.vehicle_id,ended:t.ended_at}))),loads:hash((await ok('owner','bulk.summary')).loads.map(l=>({id:l.id,state:l.state,version:l.version,dispensed:l.dispensed_grams})))};}
try{
 assert.deepEqual(await ok('','status'),{status:'ready',scope:'demo'});assert.equal((await ok('owner','payments/paystack/configuration')).environment,'test');pass('Client demo remains ready with test payments');
 const before=await snapshot();
 const d=await ok('driver','driver.location');assert.equal(d.trip.id,state.trip.id);
 const conflict=await call('driver','trip.start',{vehicleId:state.trip.vehicleId,startOdometer:1000,locationConsent:false,operationKey:randomUUID()});assert.equal(conflict.status,409);assert.match(conflict.data.error,/already have an active duty trip.*Manage trip/);result.duplicateTrip=conflict;pass('Deployed duplicate active trip returns actionable409, preserving the current trip');
 // The earlier release probed this order before delivery. It is now delivered:
 // authorised readers must hit the canonical terminal-state409 guard.
 for(const role of ['owner','dispatcher','manager']){const r=await call(role,'dispatch.candidates?orderId='+state.orders['product-cod'].id);assert.equal(r.status,409);assert.match(r.data.error,/preparing|assigned|assign|ready/i);}
 for(const role of ['finance','inventory','driver','technician','service_manager','safety_officer','customer','commercial']){
  const canonical=state.roles[role].canonicalRole;
  const r=await call(role,'dispatch.candidates?orderId='+state.orders['product-cod'].id);assert.equal(r.status,['owner','manager'].includes(canonical)?409:403,role);
 }
 assert.equal((await call('','dispatch.candidates?orderId='+state.orders['product-cod'].id)).status,401);pass('Current canonical roles and anonymous assignment-read boundaries remain enforced');
 const after=await snapshot();assert.deepEqual(after,before);result.before=before;result.after=after;pass('Orders, ledger, inventory, trips and LPG custody unchanged by release probes');result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;console.error(e.message);}
finally{result.completedAt=new Date().toISOString();await fs.writeFile('docs/role-order-acceptance-20261121/evidence/'+stage+'-release.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({stage,status:result.status,checks:checks.length}));}
