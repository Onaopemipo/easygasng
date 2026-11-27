import test from 'node:test';
import assert from 'node:assert/strict';
import { settingsFixture } from './helpers/settings-acceptance-fixture';
import { one } from '../apps/web/lib/db';
import { id, hashPassword } from '../apps/web/lib/auth';
import { applyRewardsAdjustment } from '../apps/web/lib/rewards-adjustment';

async function setup() {
 const f=await settingsFixture();
 for(const role of ['owner','reviewer','finance']) await f.call(role,'reauth',{password:f.password});
 const add=async(name:string,branch:string|null,role='customer',active=true)=>{
  const uid=id();await f.db.query('INSERT INTO users(id,name,email,password_hash,role,branch_id,active) VALUES($1,$2,$3,$4,$5,$6,$7)',[uid,name,uid+'@synthetic.invalid',hashPassword(f.password),role,branch,active]);
  return (await one(f.db,'SELECT id,public_customer_id,branch_id FROM users WHERE id=$1',[uid]))!;
 };
 const customer=await add('Points Demo GY',null);
 const value=(extra:any={})=>({customerId:customer.id,customerPublicId:customer.public_customer_id,assignBranchId:'lagos',points:100,reason:'Synthetic points test adjustment',evidence:'Synthetic isolated test evidence',...extra});
 const propose=async(extra:any={},role='owner',draft=false)=>f.call(role,'setting.propose',{key:'loyalty.adjustment',scope:'lagos',version:(await f.current('loyalty.adjustment'))!.version,value:value(extra),reason:'Synthetic customer selection test',draft});
 const balance=async()=>Number((await one(f.db,'SELECT coalesce(sum(points),0) AS n FROM reward_entries WHERE customer_id=$1',[customer.id]))!.n);
 const branch=async()=>(await one(f.db,'SELECT branch_id FROM users WHERE id=$1',[customer.id]))!.branch_id;
 const approve=async(requestId:string,role:string)=>f.call(role,'approval.decide',{id:requestId,decision:'approve',reason:'Synthetic independent review'});
 return {...f,add,customer,value,propose,balance,branch,approve};
}
test('RSEL-SEARCH: names/public IDs resolve to minimal records, duplicate names remain distinct; scoped permissions and literal search are enforced',async()=>{
 const f=await setup();try{
 const same=await f.add('Points Demo GY','lagos');const other=await f.add('Points Demo GY','qa-other');await f.add('Points Demo GY','lagos','customer',false);await f.add('Points Demo GY','lagos','driver');
 const query={scope:'lagos',query:'points demo'};
 const all=await f.call('owner','rewards.customers',query);assert.equal(all.customers.length,3);assert.equal(new Set(all.customers.map((c:any)=>c.id)).size,3);assert.equal(all.canAssignBranch,true);
 for(const c of all.customers)assert.deepEqual(Object.keys(c).sort(),['id','name','public_customer_id','branch_id','branch_name'].sort());
 const exact=await f.call('owner','rewards.customers',{scope:'lagos',query:f.customer.public_customer_id.toLowerCase()});assert.equal(exact.customers[0].id,f.customer.id);assert.equal(exact.customers.length,1);
 const scoped=await f.call('finance','rewards.customers',query);assert.deepEqual(scoped.customers.map((c:any)=>c.id),[same.id]);assert.equal(scoped.canAssignBranch,false);
 for(const role of ['manager','driver','technician','customer','commercial'])await assert.rejects(()=>f.call(role,'rewards.customers',query));
 await assert.rejects(()=>f.call('finance','rewards.customers',{scope:'qa-other',query:'Points'}));
 await assert.rejects(()=>f.call('finance','rewards.customers',{scope:'lagos',customerId:other.id}).then((r:any)=>{assert.equal(r.customers.length,0);throw Error('Empty scoped result');}),/Empty scoped result/);
 assert.equal((await f.call('owner','rewards.customers',{scope:'lagos',query:'%_'})).customers.length,0);
 assert.equal((await f.call('owner','rewards.customers',{scope:'lagos',query:"' OR true --"})).customers.length,0);
 await assert.rejects(()=>f.call('owner','rewards.customers',{scope:'not-a-branch',query:'Points'}));
 }finally{await f.db.close?.();}
});
test('RSEL-E2E: search, branchless draft, edit, submit, two independent approvals atomically assign branch and credit once without changing wallet',async()=>{
 const f=await setup();try{
 const wallet=await f.call('customer','wallet');
 const found=await f.call('owner','rewards.customers',{scope:'lagos',query:f.customer.public_customer_id});assert.equal(found.customers[0].branch_id,null);
 const r=await f.propose({},'owner',true);assert.equal(r.status,'draft');assert.equal(await f.branch(),null);assert.equal(await f.balance(),0);
 await f.call('owner','approval.edit',{id:r.id,value:f.value(),reason:'Reviewed synthetic branch and points'});
 await f.call('owner','approval.submit',{id:r.id,reason:'Submit reviewed synthetic adjustment'});
 await assert.rejects(()=>f.approve(r.id,'owner'),/independent|own/i);
 await f.approve(r.id,'reviewer');assert.equal(await f.branch(),null);assert.equal(await f.balance(),0);
 await f.approve(r.id,'finance');assert.equal(await f.branch(),'lagos');assert.equal(await f.balance(),100);
 const request=(await one(f.db,'SELECT * FROM change_requests WHERE id=$1',[r.id]))!;assert.equal(request.status,'active');
 await f.db.transaction(tx=>applyRewardsAdjustment(tx,request));assert.equal(await f.balance(),100);
 assert.equal((await f.db.query("SELECT id FROM audit_events WHERE action='rewards.customer.branch_assigned' AND target=$1",[f.customer.id])).rows.length,1);
 assert.deepEqual(await f.call('customer','wallet'),wallet);
 // An existing customer's normal correction and legacy UUID payload remain supported.
 const legacy=await f.propose({assignBranchId:undefined,customerPublicId:undefined,points:25});await f.approve(legacy.id,'reviewer');await f.approve(legacy.id,'finance');assert.equal(await f.balance(),125);
 }finally{await f.db.close?.();}
});
test('RSEL-DENIAL: invalid, spoofed, inactive/staff, branch mismatch and unauthorised initial assignment fail before a request is saved',async()=>{
 const f=await setup();try{
 for(const extra of [{customerId:f.customer.public_customer_id},{customerPublicId:'EGC-'+ 'A'.repeat(32)},{assignBranchId:'qa-other'},{assignBranchId:undefined},{points:0}])await assert.rejects(()=>f.propose(extra));
 for(const role of ['finance','manager','driver','customer'])await assert.rejects(()=>f.propose({},role));
 const staff=await f.add('Synthetic staff','lagos','driver');const inactive=await f.add('Synthetic inactive',null,'customer',false);const other=await f.add('Other branch','qa-other');
 for(const c of [staff,inactive,other])await assert.rejects(()=>f.propose({customerId:c.id,customerPublicId:c.public_customer_id}));
 assert.equal((await f.db.query("SELECT id FROM change_requests WHERE key='loyalty.adjustment'")).rows.length,0);assert.equal(await f.branch(),null);assert.equal(await f.balance(),0);
 }finally{await f.db.close?.();}
});
test('RSEL-STALE: branch or customer status changed after proposal prevents partial branch/points activation',async()=>{
 const f=await setup();try{
 const r=await f.propose();await f.approve(r.id,'reviewer');await f.db.query('UPDATE users SET branch_id=$1 WHERE id=$2',['qa-other',f.customer.id]);
 await f.approve(r.id,'finance');assert.equal(await f.branch(),'qa-other');assert.equal(await f.balance(),0);assert.equal((await one(f.db,'SELECT status FROM change_requests WHERE id=$1',[r.id]))!.status,'failed');
 await f.db.query('UPDATE users SET branch_id=NULL WHERE id=$1',[f.customer.id]);const next=await f.propose();await f.approve(next.id,'reviewer');await f.db.query('UPDATE users SET active=false WHERE id=$1',[f.customer.id]);await f.approve(next.id,'finance');assert.equal(await f.branch(),null);assert.equal(await f.balance(),0);
 }finally{await f.db.close?.();}
});
test('RSEL-ROLLBACK: ledger failure rolls back initial branch assignment and audit along with points',async()=>{
 const f=await setup();try{
 const r=await f.propose();await f.approve(r.id,'reviewer');
 await f.db.exec("CREATE FUNCTION rsel_reject() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic ledger failure'; END $$; CREATE TRIGGER rsel_failure BEFORE INSERT ON reward_entry_details FOR EACH ROW EXECUTE FUNCTION rsel_reject();");
 await f.approve(r.id,'finance');assert.equal(await f.branch(),null);assert.equal(await f.balance(),0);assert.equal((await one(f.db,'SELECT status FROM change_requests WHERE id=$1',[r.id]))!.status,'failed');assert.equal((await f.db.query("SELECT id FROM audit_events WHERE action='rewards.customer.branch_assigned' AND target=$1",[f.customer.id])).rows.length,0);
 }finally{await f.db.close?.();}
});
