// Read-only business smoke checks for the existing isolated client demo. No privilege grants or business approvals.
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('DEMO-REL-HTTP01: deployed workspace pages and scoped APIs use the current approval, technician, customer-search and privilege implementations',async()=>{
 const manifest=JSON.parse(await readFile(process.env.EASYGAS_DEMO_CREDENTIAL_FILE??'/tmp/easygas-vercel-demo-credentials.json','utf8'));
 assert.equal(manifest.purpose,'isolated-vercel-client-demo');assert.equal(manifest.project,'easygas-client-demo');const base='https://easygas-client-demo.vercel.app',tokens={};
 const call=async(role,action,body)=>{const response=await fetch(base+'/api/'+action,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(30000),headers:{'content-type':'application/json','x-easygas-client':'native',origin:base,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});return{status:response.status,body:await response.json()}};
 try{
 const home=await fetch(base,{signal:AbortSignal.timeout(30000)});assert.equal(home.status,200);const html=await home.text();assert.match(html,/Client demo/);assert.match(html,/noindex/);
 for(const role of ['owner','customer']){const account=manifest.accounts.find(x=>x.role===role);assert.ok(account);const r=await call(role,'login',{email:account.email,password:account.password});assert.equal(r.status,200,role+' sign-in');tokens[role]=r.body.token;assert.equal((await call(role,'me')).body.user.role,role);}
 const account=manifest.accounts.find(x=>x.role==='owner');assert.equal((await call('owner','reauth',{password:account.password})).status,200);
 const first=await call('owner','approvals?view=paged&pageSize=10');assert.equal(first.status,200);assert.ok(Array.isArray(first.body.rows));assert.ok(first.body.rows.length<=10);assert.equal(first.body.pageSize,10);assert.ok(first.body.summary.total>=first.body.rows.length);
 if(first.body.total>10){const next=await call('owner','approvals?view=paged&pageSize=10&page=2');assert.equal(next.status,200);assert.equal(next.body.page,2);assert.ok(next.body.rows.every(x=>!first.body.rows.some(y=>y.id===x.id)));}
 const staff=await call('owner','staff.manage');assert.equal(staff.status,200);const target=staff.body.people.find(x=>x.role==='inventory');assert.ok(target);
 const privileges=await call('owner','staff.privileges?userId='+target.id);assert.equal(privileges.status,200);assert.equal(privileges.body.user.id,target.id);assert.ok(privileges.body.privileges.length>=25);assert.ok(privileges.body.privileges.some(x=>x.id==='customers.view'));assert.equal((await call('customer','staff.privileges?userId='+target.id)).status,403);
 const customerSearch=await call('owner','credit.customers?q=Demo');assert.equal(customerSearch.status,200);assert.ok(Array.isArray(customerSearch.body));assert.ok(customerSearch.body.length<=10);assert.equal((await call('customer','credit.customers?q=Demo')).status,403);
 assert.equal((await call('owner','technicians.workspace')).status,200);assert.equal((await call('customer','technicians.workspace')).status,403);
 assert.equal((await call('customer','admin.dashboard?from=2026-11-01&to=2026-11-30')).status,403);
 console.log('PASS hosted demo branding/noindex, retained sign-in identities, approval pages, privilege catalogue and customer/technician role denials.');
 }finally{for(const role of Object.keys(tokens))await call(role,'logout',{});}
});
