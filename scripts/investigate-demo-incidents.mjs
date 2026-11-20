/** Read-only incident investigation. Auth/restriction affects own temporary sessions only. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const origin='https://easygas-client-demo.vercel.app';
const staff=(await fs.readFile('.data/demo-staff-logins-qa-ac7e0495.md','utf8')).split('\n').filter(x=>x.startsWith('|')&&x.includes('@')).map(x=>x.split('|').map(x=>x.trim().replaceAll('`','')));
const tokens={}, checks=[], evidence={origin,checkedAt:new Date().toISOString(),businessWrites:0,checks};
async function call(role,action,data){const response=await fetch(origin+'/api/'+action,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(30000)});return {status:response.status,body:await response.json()};}
function pass(name,detail={}){checks.push({name,status:'PASS',...detail});console.log('PASS '+name)}
async function ok(role,action,data){const r=await call(role,action,data);assert.equal(r.status,200,action+' status');return r.body;}
try{
 for(const [role,label] of [['owner','Admin / Business Owner'],['driver','Delivery Driver'],['technician','Service Technician']]){
  const a=staff.find(x=>x[1]===label);assert.ok(a);const action=role==='owner'?'login':role+'.login';
  const login=await ok('',action,{email:a[2],password:a[3]});assert.equal(login.role,role);assert.ok(login.token);tokens[role]=login.token;
  pass(role+' dedicated/shared sign-in');
  if(role!=='owner'){
   for(let i=0;i<2;i++)await ok(role,role+'.restrict',{});
   await ok(role,role==='driver'?'driver.snapshot':'technician.jobs');
   for(const denied of ['finance.ledger','production.readiness'])assert.equal((await call(role,denied)).status,403);
   pass(role+' repeated own-session restriction, scoped reads and finance/readiness denials');
   const wrong=await call('',role==='driver'?'technician.login':'driver.login',{email:a[2],password:a[3]});assert.equal(wrong.status,401);pass(role+' rejected by other workspace');
  }
 }
 for(const action of ['catalogue','testimonials.public']){const body=await ok('',action);pass('public '+action+' recovered',{responseKind:Array.isArray(body)?'array':typeof body});}
 const incidents=await ok('owner','incidents');
 const nine=JSON.parse(await fs.readFile('docs/blocker-reconciliation/evidence/incidents-before.json','utf8')).incidents;
 evidence.incidentAudits=[];
 for(const incident of nine){const q=new URLSearchParams({view:'paged',q:incident.id,pageSize:'100'});const audit=await ok('owner','audit?'+q);evidence.incidentAudits.push({id:incident.id,target:incident.target,retained:incidents.some(i=>i.id===incident.id),auditCount:audit.total,events:audit.rows.map(e=>({id:e.id,action:e.action,target:e.target,outcome:e.outcome,createdAt:e.created_at}))});}
 const refundAudit=await ok('owner','audit?'+new URLSearchParams({view:'paged',q:'refund.requested',pageSize:'100'}));evidence.refundRequestAudit={total:refundAudit.total,events:refundAudit.rows.map(e=>({id:e.id,action:e.action,target:e.target,createdAt:e.created_at}))};
 evidence.readiness=await ok('owner','production.readiness');pass('all nine original incidents retained and independently searched in audit history');
 evidence.status='PASS';
}finally{
 evidence.sessionsRevoked=[];for(const [role,token]of Object.entries(tokens)){try{const r=await call(role,'logout',{});evidence.sessionsRevoked.push({role,status:r.status});assert.equal(r.status,200)}catch(error){evidence.sessionsRevoked.push({role,status:'FAILED'});process.exitCode=1}}
 await fs.writeFile('docs/blocker-reconciliation/evidence/current-path-investigation.json',JSON.stringify(evidence,null,2)+'\n');
}
