// Existing isolated demo only. Reads business data; session login/logout are the only writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const base='https://easygas-client-demo.vercel.app';
const root='docs/deployment/evidence/20261119-admin-redesign';
const before=process.env.EASYGAS_RED_RELEASE_BASELINE==='true';
const routes=['support','bookings','services','quotations','finance','reconciliation','credits','reports','campaigns','recommendations','testimonials'];
test('ARDREL-HTTP: all redesigned demo routes, canonical reads, full exports and customer privilege denials work with retained demo settings',async()=>{
 const manifest=JSON.parse(await readFile('.data/demo-test-logins-20261110.json','utf8'));
 assert.equal(manifest.project,'easygas-client-demo');
 const tokens={};
 async function call(role,action,body){
  const response=await fetch(base+'/api/'+action,{method:body===undefined?'GET':'POST',signal:AbortSignal.timeout(45000),headers:{'content-type':'application/json','x-easygas-client':'native',origin:base,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  return {status:response.status,data:await response.json()};
 }
 const ok=async(role,action,body)=>{const r=await call(role,action,body);assert.equal(r.status,200,action+' HTTP '+r.status+' '+(r.data.error??''));return r.data;};
 const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
 const evidence={base,phase:before?'before':'after',routes:[],reads:[],denials:[],preservation:{}};
 try{
  assert.deepEqual(await ok('','status'),{status:'ready',scope:'demo'});
  const home=await fetch(base,{signal:AbortSignal.timeout(45000)});assert.equal(home.status,200);const html=await home.text();assert.match(html,/Client demo/);assert.match(html,/noindex/);
  for(const role of ['owner','customer']){
   const a=manifest.accounts.find(a=>a.role===role);assert.ok(a);
   const login=await ok(role,'login',{identifier:a.email,password:a.password});tokens[role]=login.token;
   const me=await ok(role,'me');assert.equal(me.user.id,a.id);assert.equal(me.user.role,role);
  }
  for(const route of routes){const r=await fetch(base+'/admin/'+route,{signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,route+' shell');evidence.routes.push({route:'/admin/'+route,status:r.status});}
  const reads=['support.list','bookings','services.manage','business.snapshot','finance.summary','finance.ledger',before?'documents.list?page=1':'documents.list?pageSize=8&page=1',before?'credits?page=1':'credits?pageSize=8&page=1','campaigns','recommendations.manage','testimonials.manage?limit=8&page=1','testimonials.analytics','testimonials.export'];
  for(const action of reads){const data=await ok('owner',action);evidence.reads.push({action,status:200});if(action==='documents.list?pageSize=8&page=1'||action==='credits?pageSize=8&page=1'){assert.equal(data.pageSize,8);assert.ok(data.rows.length<=8);}}
  for(const action of ['support.list','services.manage','finance.summary','documents.list','credits','campaigns','recommendations.manage','testimonials.manage']){assert.equal((await call('customer',action)).status,403,'customer must not read '+action);evidence.denials.push({action,status:403});}
  for(const action of before?[]:['documents.list?pageSize=0','credits?pageSize=21']){assert.equal((await call('owner',action)).status,400,action);evidence.denials.push({action,status:400});}
  const payment=await ok('owner','payments/paystack/configuration');assert.equal(payment.environment,'test');assert.equal(payment.available,true);
  const bulk=await ok('owner','bulk.summary');assert.equal(bulk.enabled,true);
  const orders=await ok('owner','orders');
  for(const reference of ['EG-2026-7BB8640B','EG-2026-FD9F2C67'])assert.equal(orders.find(o=>o.reference===reference)?.status,'delivered',reference);
  // Entire order and verified ledger readbacks must stay identical across the source-only rollout.
  evidence.preservation={orderHash:digest(orders),verifiedLedgerHash:digest(await ok('owner','finance.ledger')),paystack:'test/available',bulkEnabled:true,retainedNamedOrders:'delivered'};
  if(!before){const baseline=JSON.parse(await readFile(root+'/hosted-before.json','utf8'));assert.deepEqual(evidence.preservation,baseline.preservation);}
  await writeFile(root+'/hosted-'+(before?'before':'after')+'.json',JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS eleven shells, thirteen canonical read/export contracts, ten role/size denials, demo/noindex, sandbox/permanent bulk settings and retained delivered-order/ledger hashes');
 } finally {for(const role of Object.keys(tokens))await call(role,'logout',{});}
});
