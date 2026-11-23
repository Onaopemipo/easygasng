// Read-only stable-demo Orders acceptance using only sessions created by verify-loading-hosted.mjs.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://easygas-client-demo.vercel.app',dir='.data/loading-release/',out='docs/loading-performance/evidence/';
const state=JSON.parse(await fs.readFile(dir+'state.json','utf8'));
assert.equal(state.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const session=JSON.parse(await fs.readFile(dir+'sessions.json','utf8'));
const result={base:origin,sourceCommit:state.sourceCommit,deploymentId:state.deploymentId,status:'RUNNING',businessWrites:0,checks:[],requestTimings:[],unavailableHostedFixtures:[]};
async function read(role,query=''){
 const started=performance.now();
 const r=await fetch(origin+'/api/orders'+query,{headers:{origin,'x-easygas-client':'native',...(session.tokens[role]?{authorization:'Bearer '+session.tokens[role]}:{})},signal:AbortSignal.timeout(30000)});
 const body=await r.text();const data=JSON.parse(body);
 result.requestTimings.push({role,query:query?'scoped/invalid ID':'list',status:r.status,ms:Math.round(performance.now()-started),bytes:Buffer.byteLength(body),...(Array.isArray(data)?{rows:data.length}:{})});
 return{status:r.status,data};
}
function pass(id,detail){result.checks.push({id,status:'PASS',detail});console.log('✔ '+id+': '+detail);}
try{
 const owner=await read('owner');assert.equal(owner.status,200);assert.ok(owner.data.length);const repeat=await read('owner');assert.equal(repeat.status,200);assert.deepEqual(repeat.data,owner.data);
 for(const role of ['owner','manager','finance','driver','technician','customer','commercial']){
  const r=role==='owner'?owner:await read(role);assert.equal(r.status,role==='technician'?403:200,role+' Orders');
  if(r.status!==200)continue;
  const actor=session.actors[role];
  for(const order of r.data){
   assert.equal('delivery_code_hash' in order,false);assert.equal('delivery_code_expires_at' in order,false);
   assert.ok(Array.isArray(order.items));assert.ok(Array.isArray(order.events));assert.ok(Array.isArray(order.gas_lines));
   if(['manager','finance','driver'].includes(role))assert.equal(order.branch_id,actor.branch);
   if(role==='driver')assert.equal(order.driver_id,actor.id);
   if(['customer','commercial'].includes(role))assert.equal(order.customer_id,actor.id);
  }
  if(role!=='owner'){
   const foreign=owner.data.find(o=>['customer','commercial'].includes(role)?o.customer_id!==actor.id:role==='driver'?o.driver_id!==actor.id:o.branch_id!==actor.branch);
   if(foreign){const absent=await read(role,'?id='+encodeURIComponent(foreign.id));assert.equal(absent.status,200);assert.deepEqual(absent.data,[]);}
   else result.unavailableHostedFixtures.push(role+': no foreign record in current owner latest-100; synthetic cross-branch/identity coverage remains in LOAD-ORDERS');
  }
 }
 pass('LOADH-ORDERS','Seven role outcomes, own-customer/driver and branch filters, full list item/history/gas structure and secret stripping retained');
 assert.equal((await read('')).status,401);assert.equal((await read('owner','?id=invalid-uuid')).status,400);
 pass('LOADH-ORDER-EXCEPTIONS','Anonymous and malformed-ID reads denied; repeated owner response unchanged; no business mutation');
 result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;console.error(e.message);}
finally{result.completedAt=new Date().toISOString();await fs.writeFile(out+'orders-hosted.json',JSON.stringify(result,null,2)+'\n');console.log(`ℹ tests ${result.checks.length}\nℹ pass ${result.checks.length}\nℹ fail ${result.status==='PASS'?0:1}\nℹ skipped 0`);}
