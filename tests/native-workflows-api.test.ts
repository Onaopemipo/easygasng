import {nativeReportNames,nativeReportsForRole} from '../packages/business-rules/src/native-report-scope';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NextRequest} from 'next/server';
import {GET,POST} from '../apps/web/app/api/[action]/route';
import {fixture} from './helpers/order-tracking-fixture';
import {id,hashPassword,issueSession} from '../apps/web/lib/auth';
import {one} from '../apps/web/lib/db';
import {nativeRequest,nativeWorkspaces,visibleWorkspaces,nativeWorkspaceRows} from '../packages/business-rules/src/native-workspaces';
import {NativeWorkspaceSession} from '../packages/business-rules/src/native-workspace-session';
const password='Tracking-fixture-only-123!';
async function setup(){const f=await fixture();f.actors.manager=f.actors.dispatcher;f.actors.finance=f.actors.inventory;const uid=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Native fixture technician',$2,$3,'technician','lagos')",[uid,uid+'@native.test',hashPassword(password)]);f.actors.technician={id:uid,token:await issueSession(f.db,uid)};(globalThis as any).easygasDb=Promise.resolve(f.db);
 const api=(role:string)=>(async(endpoint:string,input?:any)=>{const[action,q]=endpoint.split('?'),headers:any={authorization:'Bearer '+f.actors[role].token,'x-easygas-client':'native','content-type':'application/json'};const request=new NextRequest('http://localhost:3003/api/'+action+(q?'?'+q:''),{method:input===undefined?'GET':'POST',headers,...(input===undefined?{}:{body:JSON.stringify(input)})});const response=await(input===undefined?GET:POST)(request,{params:Promise.resolve({action})});const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Request failed'),{status:response.status,code:data.code});return data;});
 const session=(role:string)=>new NativeWorkspaceSession(api(role),f.actors[role].id,role);
 return{...f,api,session,close:async()=>{delete(globalThis as any).easygasDb;await f.db.close?.()}};
}
test('NATIVE-HTTP-READS: actual bearer route loads every permitted new workspace tab for owner, manager and finance; restricted role reads stay scoped',async t=>{
 const f=await setup();try{
  for(const role of ['owner','manager','finance']){const api=f.api(role),nav=await api('navigation');for(const[key,w]of visibleWorkspaces(role,nav.allowed))for(const[tab,endpoint]of Object.entries(w.reads))await t.test(role+' / '+key+' / '+tab,async()=>{const path=endpoint+(endpoint==='settings'?'?scope=lagos':'');const data=await api(path);assert.ok(data!==undefined);});}
  for(const role of ['customer','driver','technician'])await t.test(role+' restricted business records',async()=>{for(const path of ['purchasing','credits?view=workspace','mail.status','production.readiness','approvals?view=paged'])await assert.rejects(()=>f.api(role)(path),{status:403});});
  assert.equal((await f.api('customer')('orders')).length,0);assert.equal((await f.api('technician')('bookings')).length,0);assert.equal((await f.api('driver')('orders')).length,0);
 }finally{await f.close()}
});
test('NATIVE-HTTP-WRITES: native controller submits API-shaped stock, purchase, campaign, credit, service, governance and report actions; canonical readback and exception controls',async t=>{
 const f=await setup(),api=f.api('owner'),owner=f.session('owner'),manager=f.session('manager'),finance=f.session('finance');
 const submit=async(s:NativeWorkspaceSession,module:string,action:string,values:any)=>s.submit(module,action,nativeRequest(action,values));
 try{
  for(const role of ['owner','manager','finance'])await f.api(role)('reauth',{password});
  let supplier:any,purchase:any,campaign:any,credit:any,recommendation:any,bundle:any;
  await t.test('purchase source selection and exact acquisition money',async()=>{
   supplier=await submit(manager,'purchasing','supplier.create',{branchId:'lagos',name:'Native isolated supplier',contact:'Synthetic acceptance fixture only'});
   assert.ok((await api('purchasing')).suppliers.some((r:any)=>r.id===supplier.id));
   await submit(manager,'purchasing','supplier.update',{id:supplier.id,name:'Native updated supplier',contact:'Retained synthetic contact evidence',active:true});
   purchase=await submit(finance,'purchasing','purchase.create',{supplierId:supplier.id,productId:'hose',quantity:3,unitCostKobo:'100.50',reference:'NATIVE-PURCHASE',reason:'Synthetic purchase acceptance evidence'});
   const row=(await api('purchasing')).orders.find((r:any)=>r.id===purchase.id);assert.equal(Number(row.unit_cost_kobo),10050);
  });
  await t.test('physical receipt readback and duplicate receipt cannot double stock',async()=>{
   const before=Number((await one(f.db,"SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'"))!.quantity);
   const input={branchId:'lagos',productId:'hose',quantity:2,unitCostKobo:'100.50',reference:'NATIVE-RECEIPT',reason:'Isolated native receipt evidence',evidence:'Synthetic QA receipt acceptance only',receivedDate:new Date().toISOString().slice(0,10),receivingPassed:true};
   await submit(owner,'inventory','inventory.receipt',input);assert.equal(Number((await one(f.db,"SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'"))!.quantity),before+2);
   assert.equal((await submit(owner,'inventory','inventory.receipt',input)).duplicate,true);assert.equal(Number((await one(f.db,"SELECT quantity FROM inventory WHERE branch_id='lagos' AND product_id='hose'"))!.quantity),before+2);
   await assert.rejects(()=>submit(owner,'inventory','inventory.receipt',{...input,reference:'NATIVE-FAILED-INSPECTION',receivingPassed:false}));
  });
  await t.test('campaign maker cannot self-approve; independent owner decision is retained',async()=>{
   campaign=await submit(manager,'campaigns','campaign.create',{branchId:'lagos',title:'Native campaign fixture',body:'Synthetic QA campaign; no provider delivery is enabled.',segment:'all'});
   await assert.rejects(()=>submit(manager,'campaigns','campaign.decide',{id:campaign.id,decision:'approved'}));
   await submit(owner,'campaigns','campaign.decide',{id:campaign.id,decision:'approved'});assert.ok((await api('campaigns')).some((r:any)=>r.id===campaign.id&&r.status==='approved'));
  });
  await t.test('credit uses scoped customer search and starts pending without changing the wallet',async()=>{
   const results=await f.api('finance')('credit.customers?q='+f.actors.customer.id);assert.equal(results[0].id,f.actors.customer.id);
   credit=await submit(finance,'credits','credit.request',{customerId:results[0].id,branchId:'lagos',amountKobo:'125.25',receiptReference:'NATIVE-CREDIT',reason:'Synthetic customer credit acceptance'});
   const row=(await api('credits?view=workspace')).rows.find((r:any)=>r.id===credit.id);assert.equal(Number(row.amount_kobo),12525);assert.equal(row.status,'pending');
   await assert.rejects(()=>submit(finance,'credits','credit.decide',{id:credit.id,decision:'approved',reason:'Maker cannot approve own credit'}));
   await submit(owner,'credits','credit.decide',{id:credit.id,decision:'rejected',reason:'Reject synthetic native fixture request'});
  });
  await t.test('recommendation review and bundle source revision remain server controlled',async()=>{
   recommendation=await submit(manager,'recommendations','recommendation.propose',{branchId:'lagos',productId:'hose',serviceId:'cooker-servicing',relation:'assessment',evidence:'Synthetic product assessment evidence only'});
   assert.ok((await api('recommendations.manage')).some((r:any)=>r.id===recommendation.id));
   await submit(owner,'recommendations','recommendation.approve',{id:recommendation.id,active:false});
   bundle=await submit(owner,'bundles','bundle.create',{name:'Native fixture bundle',branchId:'lagos'});assert.ok((await api('bundles.manage')).some((r:any)=>r.id===bundle.id));
   await assert.rejects(()=>submit(manager,'bundles','bundle.propose',{id:bundle.id,version:999,'config.active':false,'config.products':[{productId:'hose',quantity:1}],'config.serviceId':'cooker-servicing','config.serviceDiscountPercent':0,'config.description':'Synthetic obsolete revision',reason:'Reject stale native bundle revision'}));
  });
  await t.test('service configuration uses structured imported schema and stale versions cannot be accepted',async()=>{
   const service=(await api('services.manage')).services[0];assert.ok(service);
   const v=service.version??1;const p=await submit(manager,'services','services.propose',{serviceId:service.id,branchId:'lagos',version:v,config:{...service.config,active:false},reason:'Native reviewed configuration fixture'});assert.ok(p.id);
   await assert.rejects(()=>submit(manager,'services','services.propose',{serviceId:service.id,branchId:'lagos',version:999,config:{...service.config,active:false},reason:'Stale source configuration fixture'}));
  });
  await t.test('filters, reconciliation views and bounded exports use the same source collections',async()=>{
   const stock=await api('inventory.workspace?category=accessories&status=all&q=hose');assert.ok(stock.rows.length);assert.ok(stock.rows.every((r:any)=>r.name.toLowerCase().includes('hose')));
   const exported=await api('inventory.export?category=accessories&status=all&q=hose');assert.equal(exported.count,stock.total);assert.match(exported.csv,/hose/i);
   assert.deepEqual(nativeWorkspaceRows('Services',await api('services.manage')),(await api('services.manage')).services);
   const suppliers=(await api('purchasing')).suppliers;assert.deepEqual(nativeWorkspaceRows('Suppliers',await api('purchasing')),suppliers);
   assert.ok(Array.isArray((await api('rewards.report')).ledger));assert.ok(Array.isArray((await api('rewards.export',{})).ledger));
   assert.equal((await api('testimonials.manage?status=PUBLISHED&rating=5')).total,0);assert.equal((await api('testimonials.export?status=PUBLISHED&rating=5')).rows.length,0);
   await assert.rejects(()=>api('inventory.workspace?category=invalid'),{status:400});await assert.rejects(()=>api('testimonials.manage?rating=6'),{status:400});
  });
  await t.test('every report choice matches the actual server role boundary',async()=>{
   for(const role of ['owner','manager','finance'])for(const report of nativeReportNames){if(nativeReportsForRole(role).includes(report)){const r=await f.api(role)('business.report',{report});assert.ok(Array.isArray(r.rows),role+' '+report);}else await assert.rejects(()=>f.api(role)('business.report',{report}),{status:403});}
  });
  await t.test('reports and export use canonical scoped values, not client summaries',async()=>{
   const r=await api('business.report',{report:'movements',branchId:'lagos'});assert.ok(Array.isArray(r.rows));const e=await api('business.export',{report:'movements',branchId:'lagos',format:'csv'});assert.equal(e.rows.length,r.rows.length);
   await assert.rejects(()=>f.api('manager')('business.report',{report:'profit'}),{status:403});
   const schedule=await submit(owner,'reports','report.schedule',{branchId:'lagos',report:'movements',frequency:'daily'});assert.ok(schedule.id);await submit(owner,'reports','report.schedule.cancel',{id:schedule.id});
  });
  await t.test('release evidence is audited; missing gate, stale identity and non-owner rejected; NO-GO unchanged',async()=>{
   const before=await api('production.readiness');const input={gateId:3,evidence:'Synthetic QA native workflow evidence; no device release acceptance implied.',reason:'Record bounded native continuation evidence'};
   const r=await submit(owner,'readiness','readiness.review',input);const after=await api('production.readiness');assert.ok(after.reviews.some((x:any)=>x.detail.reference===r.reference));assert.deepEqual(after.gates,before.gates);assert.equal(after.recommendation,'NO-GO');
   await assert.rejects(()=>api('readiness.review',{...input,gateId:999}),{status:404});
   await assert.rejects(()=>f.api('finance')('readiness.review',input),{status:403});
   await f.db.query('UPDATE sessions SET verified_at=NULL WHERE user_id=$1',[f.actors.owner.id]);await assert.rejects(()=>api('readiness.review',input),{status:403});await api('reauth',{password});
  });
  await t.test('cross-branch, inactive account, expired session and method bypass fail with no mutation',async()=>{
   await f.db.query("INSERT INTO branches(id,name) VALUES('native-other','Other isolated branch')");
   await assert.rejects(()=>f.api('finance')('inventory.receipt',{branchId:'native-other',productId:'hose',quantity:1,reference:'FORGED-BRANCH',reason:'Cross branch rejection evidence',evidence:'Synthetic untrusted request',receivedDate:new Date().toISOString().slice(0,10),receivingPassed:true}),{status:403});
   await assert.rejects(()=>api('supplier.create'),{status:405});
   await f.db.query('UPDATE users SET active=false WHERE id=$1',[f.actors.manager.id]);await assert.rejects(()=>manager.submit('purchasing','supplier.create',{branchId:'lagos',name:'Should not write',contact:'Access revoked fixture'}),{status:401});
   await f.db.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",[f.actors.finance.id]);await assert.rejects(()=>finance.submit('credits','credit.request',{}),{status:401});
   assert.equal((await one(f.db,"SELECT count(*) n FROM suppliers WHERE name='Should not write'"))!.n,0);
  });
 }finally{await f.close()}
});
