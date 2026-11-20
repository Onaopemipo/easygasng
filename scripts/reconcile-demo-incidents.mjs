/** Apply only the nine reviewed demo incident dispositions; never post financial/stock/qualification changes. */
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
assert.equal(process.argv[2],'apply-reviewed-demo-dispositions');
const origin='https://easygas-client-demo.vercel.app',dir='docs/blocker-reconciliation/evidence/';
const release=JSON.parse(await fs.readFile(dir+'stable-identity.json','utf8'));assert.equal(release.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');assert.equal(release.readyState,'READY');assert.equal(release.stableAlias,origin);
const before=JSON.parse(await fs.readFile(dir+'incidents-before.json','utf8'));
const review=JSON.parse(await fs.readFile(dir+'incident-findings.json','utf8'));assert.equal(review.total,9);assert.equal(review.findings.length,9);assert.equal(new Set(review.findings.map(f=>f.id)).size,9);
const staff=(await fs.readFile('.data/demo-staff-logins-qa-ac7e0495.md','utf8')).split('\n').filter(x=>x.startsWith('|')&&x.includes('@')).map(x=>x.split('|').map(x=>x.trim().replaceAll('`','')));const a=staff.find(x=>x[1]==='Admin / Business Owner');assert.ok(a);let token;
const report={origin,deploymentId:release.id,sourceCommit:release.sourceCommit,startedAt:new Date().toISOString(),financialWrites:0,stockWrites:0,qualificationWrites:0,results:[]};
async function call(action,data){const r=await fetch(origin+'/api/'+action,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin,...(token?{authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,action+' status '+r.status);return r.json();}
try{
 const login=await call('login',{email:a[2],password:a[3]});assert.equal(login.role,'owner');token=login.token;assert.ok(token);await call('reauth',{password:a[3]});
 assert.equal((await call('production.readiness')).recommendation,'NO-GO');
 for(const finding of [...review.findings,...(review.supplements??[])]){
  const original=[...before.incidents,...(review.supplementRecords??[])].find(i=>i.id===finding.id);assert.ok(original);assert.equal(original.category,'operation_failure');assert.equal(original.target,finding.target);
  const route='incidents?view=detail&id='+finding.id;const current=await call(route);assert.equal(current.incident.target,original.target);assert.equal(current.incident.detail,original.detail);
  const note='PBR21 / synthetic client demo only / '+finding.confidence+': '+finding.finding+' Evidence: '+finding.evidence.join(', ')+'. Original record/history retained. Production NO-GO, actual-import hold and retain-all remain.';
  assert.ok(note.length<=2000);assert.ok(['resolved','acknowledged'].includes(finding.plannedDisposition));
  const recorded=current.events.some(e=>e.note===note&&e.status===finding.plannedDisposition);
  if(!recorded){assert.equal(current.incident.status,original.status,'Stop if another reviewer changed this record');await call('incident.update',{id:finding.id,status:finding.plannedDisposition,note});}
  const after=await call(route);assert.equal(after.incident.status,finding.plannedDisposition);assert.equal(after.incident.detail,original.detail);assert.ok(after.events.some(e=>e.note===note&&e.status===finding.plannedDisposition));assert.equal(after.total,current.total+(recorded?0:1));
  report.results.push({id:finding.id,target:finding.target,status:after.incident.status,confidence:finding.confidence,originalDetailRetained:true,historyBefore:current.total,historyAfter:after.total,noteRecorded:true});
  console.log('PASS '+finding.id+' '+finding.plannedDisposition);
 }
 const ready=await call('production.readiness');assert.equal(ready.recommendation,'NO-GO');assert.match(ready.gates.find(g=>g.id===17).evidence,/3 unresolved/);report.readiness=ready;report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.message;process.exitCode=1;}finally{
 if(token){try{await call('logout',{});report.sessionRevoked=true;}catch{report.sessionRevoked=false;report.status='FAIL';process.exitCode=1;}}
 report.finishedAt=new Date().toISOString();await fs.writeFile(dir+'incident-dispositions.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,records:report.results.length,sessionRevoked:report.sessionRevoked}));if(report.failure)console.error(report.failure);
}
