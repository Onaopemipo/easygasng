import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createDatabase,migrate,one} from '../apps/web/lib/db';
import {dispatch} from '../apps/web/lib/service';
import {hashPassword,id,issueSession} from '../apps/web/lib/auth';
async function fixture(){const db=await createDatabase('memory://');await migrate(db);const password='Owner-policy-123!';const actors:Record<string,any>={};for(const name of ['owner','otherOwner','manager','administrator','finance','safety_officer']){const role=name==='otherOwner'?'owner':name,uid=id();await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",[uid,name,`${uid}@test.invalid`,hashPassword(password),consolidatedRole(role)]);actors[name]={id:uid,token:await issueSession(db,uid)};}const call=(role:string,action:string,input:any={})=>dispatch(action,actors[role].token,input,db);for(const role of Object.keys(actors))await call(role,'reauth',{password});const current=(key='gas.price_per_kg')=>one(db,"SELECT * FROM settings WHERE key=$1 AND scope='lagos'",[key]);const propose=async(role='owner',extras:any={})=>call(role,'setting.propose',{key:'gas.price_per_kg',scope:'lagos',version:(await current())!.version,value:180500,reason:'Owner authorised price change',...extras});return{db,actors,call,current,propose,password};}

import {approvalProgress,currentAdminApproval} from '../apps/web/lib/governance';
test('ASA01: Admin policy is unconditional across every definition, staff still cannot self-approve',async()=>{const f=await fixture();try{
 process.env.EASYGAS_OWNER_AUTO_APPROVAL='false';
 const settings=await f.call('owner','settings',{scope:'lagos'});assert.ok(settings.length>20);assert.ok(settings.every((s:any)=>s.owner_auto_approval === (s.propose_roles.length > 0)));
 const staff=await f.propose('manager');await assert.rejects(()=>f.call('manager','approval.decide',{id:staff.id,decision:'approve',reason:''}),/independent|authority/);
 const approved=await f.call('owner','approval.decide',{id:staff.id,decision:'approve',reason:''});assert.equal(approved.status,'active');
 const replay=await f.call('owner','approval.decide',{id:staff.id,decision:'approve',reason:''});assert.equal(replay.duplicate,true);
 assert.equal(Number((await one(f.db,'SELECT count(*) n FROM approval_decisions WHERE request_id=$1',[staff.id]))!.n),1);
 assert.equal(await currentAdminApproval(f.db,staff.id),true);
 await f.db.query("UPDATE users SET role='manager' WHERE id=$1",[f.actors.owner.id]);assert.equal(await currentAdminApproval(f.db,staff.id),false);
}finally{delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;await f.db.close?.();}});
test('ASA02: one Admin decision satisfies risk4 role coverage and own legacy requests; stale and own-privilege changes fail',async()=>{const f=await fixture();try{
 const key='asa.risk4';await f.db.query(`INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,'ASA risk4','Finance Operations','Synthetic approval test','owner',4,'integer','["manager"]','["finance"]','["manager","finance"]','["owner","finance"]',true)`,[key]);await f.db.query("INSERT INTO settings(key,scope,value) VALUES($1,'lagos','1')",[key]);
 const staff=await f.call('manager','setting.propose',{key,scope:'lagos',version:1,value:2,reason:'Synthetic financial setting'});
 assert.ok((await f.call('owner','approvals')).find((r:any)=>r.id===staff.id)?.can_approve);
 assert.equal((await f.call('owner','approval.decide',{id:staff.id,decision:'approve',reason:''})).status,'active');
 const r=await one(f.db,'SELECT * FROM change_requests WHERE id=$1',[staff.id]),d=await one(f.db,'SELECT * FROM setting_definitions WHERE key=$1',[key]);const progress=await approvalProgress(f.db,r!,d!);assert.equal(progress.required,1);assert.equal(progress.complete,true);assert.deepEqual(progress.missing_roles,[]);
 const draft=await f.call('owner','setting.propose',{key,scope:'lagos',version:2,value:3,reason:'Own saved request',draft:true});await f.db.query("UPDATE change_requests SET status='pending_approval' WHERE id=$1",[draft.id]);assert.equal((await f.call('owner','approval.decide',{id:draft.id,decision:'approve',reason:''})).status,'active');
 await assert.rejects(()=>f.call('owner','setting.propose',{key:'security.permissions',scope:'lagos',version:1,value:{userId:f.actors.owner.id,role:'owner',branchId:'lagos'},reason:'Self privilege change must fail'}),/own|Self/);
}finally{await f.db.close?.();}});
test('ASA03: direct staff grants need one Admin confirmation and record an audit',async()=>{const f=await fixture();try{
 const uid=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'New colleague',$2,$3,'customer','lagos')",[uid,uid+'@test.invalid',hashPassword(f.password)]);
 const result=await f.call('owner','setting.propose',{key:'security.permissions',scope:'lagos',version:1,value:{userId:uid,role:'driver',branchId:'lagos'},reason:'Admin grants colleague driver access'});assert.equal(result.status,'active');
 assert.equal((await one(f.db,'SELECT role FROM users WHERE id=$1',[uid]))!.role,'driver');
 assert.equal(Number((await one(f.db,"SELECT count(*) n FROM audit_events WHERE action='approval.owner_auto_approved' AND target=$1",[result.id]))!.n),1);
}finally{await f.db.close?.();}});

test('ASA04: Admin confirms own actual-receipt credit once; Finance still needs another reviewer',async()=>{const f=await fixture();try{
 const customer=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'ASA customer',$2,$3,'customer','lagos')",[customer,customer+'@test.invalid',hashPassword(f.password)]);
 await f.db.query("UPDATE settings SET value='true' WHERE key='wallet.enabled'");
 const credit=await f.call('owner','credit.request',{customerId:customer,amountKobo:10000,receiptReference:'ASA-CREDIT',reason:'Synthetic actual receipt evidence'});
 const rows=await f.call('owner','credits',{view:'workspace'});assert.equal(rows.rows.find((r:any)=>r.id===credit.id).can_decide,true);
 await f.call('owner','credit.decide',{id:credit.id,decision:'approved',reason:'Actual receipt checked'});
 await f.call('owner','credit.decide',{id:credit.id,decision:'approved',reason:'Retry confirmed receipt'});
 assert.equal(Number((await one(f.db,'SELECT count(*) n FROM wallet_entries WHERE customer_id=$1',[customer]))!.n),1);
 const other=await f.call('finance','credit.request',{customerId:customer,amountKobo:10000,receiptReference:'ASA-STAFF-CREDIT',reason:'Synthetic staff receipt evidence'});
 await assert.rejects(()=>f.call('finance','credit.decide',{id:other.id,decision:'approved',reason:'Own Finance request'}),/different finance/);
}finally{await f.db.close?.();}});

test('ASA05: Admin approves own bounded delegation, its scope and ceiling stay enforced',async()=>{const f=await fixture();try{
 await f.db.query("UPDATE setting_definitions SET view_roles=view_roles||jsonb_build_array('finance'::text) WHERE key='delivery.capacity'");
 const grant=await f.call('owner','delegation.request',{delegateId:f.actors.finance.id,key:'delivery.capacity',scope:'lagos',maximumValue:80,startsAt:new Date().toISOString(),expiresAt:new Date(Date.now()+3600000).toISOString(),reason:'Synthetic bounded coverage grant'});
 await f.call('owner','delegation.decide',{id:grant.id,decision:'approved',reason:'Admin final approval'});
 const req=await f.call('manager','setting.propose',{key:'delivery.capacity',scope:'lagos',version:1,value:70,reason:'Synthetic delegated capacity'});assert.equal((await f.call('finance','approval.decide',{id:req.id,decision:'approve',reason:''})).status,'active');
 const excessive=await f.call('manager','setting.propose',{key:'delivery.capacity',scope:'lagos',version:2,value:90,reason:'Exceeds delegated ceiling'});await assert.rejects(()=>f.call('finance','approval.decide',{id:excessive.id,decision:'approve',reason:''}),/authority/);
}finally{await f.db.close?.();}});

test('ASA06: migration permits Admin own catalogue decisions and denies a non-Admin database self-review',async()=>{const f=await fixture();try{
 assert.ok(await one(f.db,"SELECT version FROM schema_migrations WHERE version='085'"));
 const c=await f.call('owner','compatibility.propose',{productId:'hose',equipmentBrand:'Synthetic',equipmentModel:'ASA',connectionSpec:'Test only',pressureSpec:'Test only',evidence:'Synthetic compatibility evidence',status:'unknown'});
 await f.call('owner','compatibility.review',{id:c.id,approve:true});assert.equal((await one(f.db,'SELECT reviewed_by FROM product_compatibility WHERE id=$1',[c.id]))!.reviewed_by,f.actors.owner.id);
 const rule=await f.call('owner','recommendation.propose',{branchId:'lagos',productId:'hose',serviceId:'cooker-servicing',relation:'assessment',evidence:'Synthetic professional assessment suggestion'});
 await f.call('owner','recommendation.approve',{id:rule.id,active:true});assert.equal((await one(f.db,'SELECT reviewed_by FROM recommendation_rules WHERE id=$1',[rule.id]))!.reviewed_by,f.actors.owner.id);
 const staff=await f.call('manager','compatibility.propose',{productId:'hose',equipmentBrand:'Synthetic',equipmentModel:'Staff ASA',connectionSpec:'Test only',pressureSpec:'Test only',evidence:'Synthetic negative evidence',status:'unknown'});
 await assert.rejects(()=>f.db.query('UPDATE product_compatibility SET reviewed_by=proposed_by WHERE id=$1',[staff.id]),/active Admin/);
 await assert.rejects(()=>f.db.query('DELETE FROM audit_events WHERE target=$1',[c.id]),/Append-only/);
}finally{await f.db.close?.();}});

test('ASA07: Admin approves own exact invoice correction once; issued documents and final decisions stay immutable',async()=>{const f=await fixture();try{
 const customer=id(),order=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Invoice customer',$2,$3,'customer','lagos')",[customer,customer+'@test.invalid',hashPassword(f.password)]);
 await f.db.query(`INSERT INTO orders(id,reference,customer_id,branch_id,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','fixture',now()+interval '1 day','cash',100000,500000,600000,'{"street":"Fixture Road","zone":"Lekki"}','2026-12-01','AM',$1,'fixture')`,[order,customer]);
 await f.call('owner','invoice.issue',{orderId:order});
 const note=await f.call('owner','invoice.correction.propose',{orderId:order,kind:'credit',amountKobo:10000,reason:'Synthetic exact invoice correction',operationKey:id()});
 await f.call('owner','invoice.correction.decide',{orderId:order,noteId:note.noteId,approve:true,operationKey:id()});
 assert.equal((await one(f.db,'SELECT approved_by FROM invoice_notes WHERE id=$1',[note.noteId]))!.approved_by,f.actors.owner.id);
 await assert.rejects(()=>f.db.query("UPDATE invoice_notes SET amount_kobo=20000 WHERE id=$1",[note.noteId]),/immutable/);
 await assert.rejects(()=>f.db.query("UPDATE customer_invoices SET total_kobo=1 WHERE order_id=$1",[order]),/immutable/);
}finally{await f.db.close?.();}});

test('ASA08: own Admin expense needs no colleague approval; actual recording/payment evidence and replay checks remain',async()=>{const f=await fixture();try{
 const expense=await f.call('owner','expense.create',{branchId:'lagos',categoryId:'fuel',amountKobo:50000,date:'2026-11-27',payee:'Synthetic QA supplier',description:'Synthetic documented fuel expense',method:'cash',evidence:'Synthetic actual receipt for local QA',reference:'ASA-EXPENSE'});
 assert.equal(expense.state,'ACTIVE');assert.equal(await currentAdminApproval(f.db,expense.requestId),true);
 await f.call('owner','expense.record',{id:expense.id,reference:'ASA-RECORD',reason:'Actual record checked'});
 await f.call('owner','expense.pay',{id:expense.id,reference:'ASA-PAYMENT',reason:'Actual payment evidence checked'});
 await f.call('owner','expense.pay',{id:expense.id,reference:'ASA-PAYMENT',reason:'Idempotent receipt retry'});
 assert.equal(Number((await one(f.db,"SELECT count(*) n FROM expense_events WHERE expense_id=$1 AND kind='paid'",[expense.id]))!.n),1);
}finally{await f.db.close?.();}});

test('ASA09: Admin owns purchase, interbranch transfer and campaign approvals without another person',async()=>{const f=await fixture();try{
 const supplier=await f.call('owner','supplier.create',{branchId:'lagos',name:'ASA synthetic supplier',contact:'Synthetic contact only'});
 const purchase=await f.call('owner','purchase.create',{supplierId:supplier.id,productId:'hose',quantity:2,unitCostKobo:10000,reference:'ASA-PURCHASE',reason:'Synthetic purchase approval'});assert.equal(purchase.state,'ACTIVE');assert.equal((await one(f.db,'SELECT approved_by FROM purchase_orders WHERE id=$1',[purchase.id]))!.approved_by,f.actors.owner.id);
 await f.db.query("INSERT INTO branches(id,name) VALUES('asa-destination','Synthetic destination')");await f.db.query("INSERT INTO inventory(branch_id,product_id) VALUES('asa-destination','hose')");await f.db.query("UPDATE inventory SET quantity=10 WHERE branch_id='lagos' AND product_id='hose'");
 const transfer=await f.call('owner','transfer.create',{sourceBranch:'lagos',destinationBranch:'asa-destination',productId:'hose',quantity:3,reference:'ASA-TRANSFER',reason:'Synthetic transfer approval'});assert.equal(transfer.state,'ACTIVE');
 await f.call('owner','transfer.dispatch',{id:transfer.id,reason:'Actual dispatch count checked'});const receipt={id:transfer.id,quantity:3,reference:'ASA-TRANSFER-RECEIPT',reason:'Actual destination count checked'};await f.call('owner','transfer.receive',receipt);await f.call('owner','transfer.receive',receipt);
 assert.equal(Number((await one(f.db,"SELECT quantity FROM inventory WHERE branch_id='asa-destination' AND product_id='hose'"))!.quantity),3);
 const campaign=await f.call('owner','campaign.create',{branchId:'lagos',title:'Synthetic QA campaign',body:'Synthetic local campaign with no recipients or external sends',segment:'all'});await f.call('owner','campaign.decide',{id:campaign.id,decision:'approved'});assert.equal((await one(f.db,'SELECT approved_by FROM campaigns WHERE id=$1',[campaign.id]))!.approved_by,f.actors.owner.id);
}finally{await f.db.close?.();}});
