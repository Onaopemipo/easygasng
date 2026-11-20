// Read the disposable preview only. Never accepts a hosted URL or private credentials.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const base='http://127.0.0.1:3120';const tokens={};
async function call(role,action,body){const r=await fetch(base+'/api/'+action,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin:base,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,200,action);return r.json();}
try{
 for(const role of ['owner','manager'])tokens[role]=(await call('', 'login',{email:role+'@settings.example.test',password:'Synthetic-settings-only-123!'})).token;
 const settings=await call('owner','settings?scope=lagos'),requests=await call('owner','approvals');const checks=[];
 for(const [key,role] of [['service.cooker-installation','owner'],['checklist.cooker-installation','owner'],['legal.cancellation','owner'],['business.hours','manager']]){
 const row=settings.find(d=>d.key===key);assert.equal(row.version,1,key+' remains inactive');const draft=requests.find(r=>r.key===key&&r.status==='draft');assert.ok(draft,key+' actual browser draft');
 if(key.startsWith('service.')){assert.equal(draft.proposed_value.priceKobo,120029);assert.equal(draft.proposed_value.calloutKobo,10001);assert.deepEqual(draft.proposed_value.zones,['Synthetic Area A','Synthetic Area B']);assert.equal(row.value.priceKobo,null);}
 if(key.startsWith('checklist.')){assert.equal(draft.proposed_value[0].required,true);assert.deepEqual(row.value,[]);}
 if(key.startsWith('legal.')){assert.equal(draft.proposed_value.effectiveAt,'2026-11-20T23:00:00.000Z');assert.equal(draft.proposed_value.published,false);assert.equal(row.value.content,'');}
 if(key==='business.hours'){assert.equal(draft.proposed_value,'09:00–18:00');assert.equal(row.value,'08:00–18:00');}
 checks.push({key,role,status:'draft',activeVersion:row.version,result:'PASS'});
 }
 await fs.writeFile('docs/admin-settings-acceptance/evidence/local-browser-drafts.json',JSON.stringify({base,checks,canonicalMoneyAndDateConfirmed:true,noDraftActivated:true},null,2)+'\n');console.log('PASS four actual browser drafts retained exact canonical values and stayed inactive');
}finally{for(const role of Object.keys(tokens))await call(role,'logout',{}).catch(()=>{});}
