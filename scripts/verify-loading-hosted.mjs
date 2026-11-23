// Demo-only deployment verification. Creates temporary auth sessions, performs reads and denied writes only.
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import assert from 'node:assert/strict';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createHash,randomUUID} from 'node:crypto';
const exec=promisify(execFile),stage=process.argv[2],dir='.data/loading-release/',out='docs/loading-performance/evidence/',origin='https://easygas-client-demo.vercel.app';
assert.ok(['before','candidate','stable','cleanup'].includes(stage));
const state=JSON.parse(await fs.readFile(dir+'state.json','utf8')),project=JSON.parse(await fs.readFile('.vercel/project.json','utf8'));
assert.equal(project.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');assert.equal(state.projectId,project.projectId);assert.equal(project.orgId,'team_fSpg4LlHLQsMVao9qUVmd20h');
const base=stage==='candidate'?state.candidateUrl:origin;if(stage==='candidate')assert.match(base,/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/);
const roles=['owner','manager','finance','driver','technician','customer','commercial'];
let session={tokens:{},actors:{}};try{session=JSON.parse(await fs.readFile(dir+'sessions.json','utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
const result={stage,base,sourceCommit:state.sourceCommit,deploymentId:state.deploymentId,businessWrites:0,checks:[],requestTimings:[],status:'RUNNING'};
function pass(id,detail){result.checks.push({id,status:'PASS',...(detail?{detail}:{})});console.log('✔ '+id+': '+(detail??'Passed'));}
async function transport(route,options){
 if(stage!=='candidate')return fetch(base+route,{...options,signal:AbortSignal.timeout(30000)});
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-pub24-http-'));
 try{const output=path.join(temp,'response'),config=path.join(temp,'request.cfg'),lines=['silent','show-error','max-time = 30','request = '+JSON.stringify(options.method),'output = '+JSON.stringify(output),'write-out = "%{http_code}"'];
 for(const[k,v]of Object.entries(options.headers))lines.push('header = '+JSON.stringify(k+': '+v));
 if(options.body){const input=path.join(temp,'body.json');await fs.writeFile(input,options.body,{mode:0o600});lines.push('data-binary = '+JSON.stringify('@'+input));}
 await fs.writeFile(config,lines.join('\n')+'\n',{mode:0o600});const r=await exec('vercel',['curl',route,'--deployment',base,'--scope','onaopemipos-projects','--','--config',config],{cwd:state.sourceDirectory,timeout:60000,maxBuffer:10000});const status=Number(r.stdout.trim().match(/(\d{3})$/)?.[1]),text=await fs.readFile(output,'utf8');return{status,text:async()=>text};
 }finally{await fs.rm(temp,{recursive:true,force:true});}
}
async function call(role,action,body){const started=performance.now();const r=await transport('/api/'+action,{method:body===undefined?'GET':'POST',headers:{origin,'content-type':'application/json','x-easygas-client':'native',...(session.tokens[role]?{authorization:'Bearer '+session.tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});let data;try{data=JSON.parse(await r.text());}catch{throw Error(action+' returned non-JSON HTTP'+r.status);}result.requestTimings.push({role,action,status:r.status,ms:Math.round(performance.now()-started)});return{status:r.status,data};}
async function ok(role,action,body){const r=await call(role,action,body);assert.equal(r.status,200,role+' '+action+' '+r.status);return r.data;}
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['checkedAt','asOf','generatedAt','observedAt','serverTime'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
async function snapshot(){const orders=await ok('owner','orders'),inventory=await ok('owner','inventory'),ledger=await ok('owner','finance.ledger?limit=500'),fleet=await ok('owner','fleet.summary'),bulk=await ok('owner','bulk.summary'),policies=await ok('','policies');return{orders:hash(orders),inventory:hash(inventory),ledger:hash(ledger),vehicles:hash(fleet.vehicles),trips:hash(fleet.trips.map(t=>({id:t.id,driver:t.driver_id,vehicle:t.vehicle_id,branch:t.branch_id,started:t.started_at,ended:t.ended_at,nextSequence:t.nextSequence}))),custody:hash(bulk.loads.map(l=>({id:l.id,state:l.state,version:l.version,dispensed:l.dispensed_grams}))),policies:hash(policies),counts:{orders:orders.length,vehicles:fleet.vehicles.length,trips:fleet.trips.length,custodyLoads:bulk.loads.length}};}
try{
 if(stage==='cleanup'){for(const role of Object.keys(session.tokens)){assert.equal((await call(role,'logout',{})).status,200);delete session.tokens[role];}await fs.writeFile(dir+'sessions.json',JSON.stringify(session),{mode:0o600});pass('LOADH-CLEANUP','All seven verifier-created sessions revoked');}
 else{
  if(stage==='before'){
   const creds=JSON.parse(await fs.readFile('.data/demo-test-logins-20261110.json','utf8'));assert.equal(creds.project,'easygas-client-demo');
   for(const role of roles){const account=creds.accounts.find(a=>a.role===role);assert.ok(account?.password);if(!session.tokens[role]){const login=await call('', 'login',{email:account.email,password:account.password});assert.equal(login.status,200,role+' sign-in');session.tokens[role]=login.data.token;await fs.writeFile(dir+'sessions.json',JSON.stringify(session),{mode:0o600});}const me=await ok(role,'me');assert.equal(me.user.role,role);session.actors[role]={id:me.user.id,role:me.user.role,branch:me.user.branch_id??me.user.branchId};}
   await fs.writeFile(dir+'sessions.json',JSON.stringify(session),{mode:0o600});pass('LOADH-SESSIONS','Fresh verifier-owned sessions for seven canonical roles; no identity/permission change');
  }
  assert.deepEqual(await ok('','status'),{status:'ready',scope:'demo'});const payment=await ok('owner','payments/paystack/configuration');assert.equal(payment.environment,'test');const readiness=await ok('owner','production.readiness');assert.equal(readiness.recommendation,'NO-GO');pass('LOADH-READY','Ready demo, test payment environment and production NO-GO retained');
  const before=await snapshot();
  for(const role of roles){const allowed=['owner','manager','finance'].includes(role),custodyAllowed=allowed||role==='driver',fleet=await call(role,'fleet.summary');assert.equal(fleet.status,allowed?200:403,role+' fleet');if(role==='driver'){const location=await ok(role,'driver.location');if(location.trip){assert.equal(location.trip.driver_id,session.actors[role].id);assert.equal(location.trip.branch_id,session.actors[role].branch);}}
   if(allowed&&role!=='owner'){const actor=session.actors[role];for(const v of fleet.data.vehicles)assert.equal(v.branch_id,actor.branch,role+' vehicle branch');for(const t of fleet.data.trips){assert.equal(t.branch_id,actor.branch);if(role==='driver')assert.equal(t.driver_id,actor.id);}}
   const centre=await call(role,'dispatch.centre?date=2026-11-23&tab=queue&page=1');assert.equal(centre.status,['owner','manager'].includes(role)?200:403,role+' dispatch');
   assert.equal((await call(role,'manifest.summary')).status,custodyAllowed?200:403,role+' manifests');assert.equal((await call(role,'bulk.summary')).status,custodyAllowed?200:403,role+' LPG');assert.equal((await call(role,'dispatch.board')).status,['owner','manager'].includes(role)?200:403,role+' routing');
  }assert.equal((await call('','fleet.summary')).status,401);pass('LOADH-ROLES','Seven roles, management fleet scope, restricted driver own-trip access, custody/planning restrictions and anonymous denial pass');
  const denied=[];for(const role of ['owner','manager','finance','driver','technician','customer','commercial']){const r=await call(role,'fleet.vehicle.create',{branchId:'lagos',label:'SYNTHETIC RELEASE DENIAL ONLY',capacityGrams:2000,lpgSuitable:false,operationKey:randomUUID()});assert.equal(r.status,403,role+' registration');if(role==='owner')assert.equal(r.data.code,'REAUTH_REQUIRED');denied.push({role,status:r.status,code:r.data.code});}result.denied=denied;pass('LOADH-GUARDS','Fresh unverified owner and six nonowner roles cannot register a vehicle');
  const after=await snapshot();assert.deepEqual(after,before);result.snapshot=after;
  if(stage==='before')await fs.writeFile(dir+'before.json',JSON.stringify(after,null,2)+'\n');else assert.deepEqual(after,JSON.parse(await fs.readFile(dir+'before.json','utf8')));
  pass('LOADH-PRESERVE','Orders, inventory, complete current ledger response, vehicles, trip state, LPG custody and policies unchanged');
 }
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;console.error(e.message);}
finally{result.completedAt=new Date().toISOString();await fs.writeFile(out+stage+'-hosted.json',JSON.stringify(result,null,2)+'\n');console.log(`ℹ tests ${result.checks.length}\nℹ pass ${result.checks.length}\nℹ fail ${result.status==='PASS'?0:1}\nℹ skipped 0`);}
