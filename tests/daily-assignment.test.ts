import test from 'node:test';
import assert from 'node:assert/strict';
import { setup } from './helpers/daily-delivery-fixture';
import { one } from '../apps/web/lib/db';
import { id } from '../apps/web/lib/auth';
import { mismatched } from './helpers/daily-assignment-fixture';
async function balances(f:any){return {run:await f.summary(),stock:await one(f.db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'"),order:await one(f.db,'SELECT driver_id,status,tracking_version FROM orders WHERE id=$1',[f.o.id]),alloc:(await f.db.query("SELECT run_id,order_id,grams,state FROM daily_delivery_allocations WHERE order_id=$1 ORDER BY id",[f.o.id])).rows};}
test('DAYASSIGN-ATOMIC direct reassign changes driver, revokes old acceptance and reserves exact paid gas once; retry replays without reauth',async()=>{
 const f=await mismatched();try {
 const before=await balances(f);const input={orderId:f.o.id,runId:before.run.id,version:before.order.tracking_version,operationKey:id()};
 await f.db.query('UPDATE sessions SET verified_at=NULL WHERE user_id=$1',[f.actors.owner.id]);
 const r=await f.call('owner','dispatch.assignToday',input);assert.equal(r.driverId,f.actors.today.id);assert.match(r.message,/gas reserved/);
 const after=await balances(f);assert.equal(after.order.driver_id,f.actors.today.id);assert.equal(Number(after.run.committed_grams),12500);assert.equal(Number(after.stock?.grams),500000);assert.equal(Number(before.stock?.reserved_grams)-Number(after.stock?.reserved_grams),12500);assert.equal(after.alloc.length,1);
 assert.equal((await f.call('owner','dispatch.assignToday',input)).replayed,true);assert.deepEqual(await balances(f),after);
 const s=await f.snapshot(f.o.id);await assert.rejects(()=>f.run('driver','dispatch.respond',{orderId:f.o.id,version:s.tracking_version,decision:'acknowledged'}),/another driver|assign|permission/i);
 await f.run('today','dispatch.respond',{orderId:f.o.id,version:s.tracking_version,decision:'acknowledged'});
 const current=await f.snapshot(f.o.id);await f.run('today','driver.depart',{orderId:f.o.id,version:current.tracking_version,manifest:current.manifest});assert.equal((await f.snapshot(f.o.id)).status,'out_for_delivery');
 const audit=await one(f.db,"SELECT detail FROM audit_events WHERE action='dispatch.assignToday' AND target=$1",[f.o.id]);assert.equal(audit?.detail.driverId,f.actors.today.id);assert.equal(audit?.detail.previousDriver,f.actors.driver.id);
 // The canonical operation result and existing assignment/reservation audit are persisted.
 assert.equal(Number((await one(f.db,"SELECT count(*) n FROM business_operation_results WHERE action='dispatch.assignToday' AND committed_at IS NOT NULL"))?.n),1);
 }finally{await f.db.close?.();}
});
test('DAYASSIGN-DENY role, branch, stale run/order, unavailable driver and started delivery leave assignment and stock unchanged',async()=>{
 const f=await mismatched();try{
 const state=await balances(f);const req={orderId:f.o.id,runId:state.run.id,version:state.order.tracking_version};
 for(const [who,input] of [['customer',req],['driver',req],['owner',{...req,version:req.version-1}],['owner',{...req,runId:id()}]] as any[]){await assert.rejects(()=>f.run(who,'dispatch.assignToday',input));assert.deepEqual(await balances(f),state);}
 await f.db.query('UPDATE users SET driver_available=false WHERE id=$1',[f.actors.today.id]);await assert.rejects(()=>f.run('owner','dispatch.assignToday',req),/availability|unavailable/i);assert.deepEqual(await balances(f),state);await f.db.query('UPDATE users SET driver_available=true WHERE id=$1',[f.actors.today.id]);
 await f.db.query("INSERT INTO branches(id,name) VALUES('day-other','Synthetic other branch')");await f.db.query("UPDATE users SET branch_id='day-other' WHERE id=$1",[f.actors.dispatcher.id]);
 await assert.rejects(()=>f.run('dispatcher','dispatch.assignToday',req));assert.deepEqual(await balances(f),state);

 await f.db.query("UPDATE delivery_attempts SET picked_up_at=now(),state='picked_up' WHERE order_id=$1",[f.o.id]);const picked=await balances(f);await assert.rejects(()=>f.run('owner','dispatch.assignToday',req),/held goods|started|pickup/i);assert.deepEqual(await balances(f),picked);
 }finally{await f.db.close?.();}
});
test('DAYASSIGN-CAPACITY normal assignment reserves automatically and a second over-capacity order rolls back completely',async()=>{
 const f=await setup();try{
 await f.run('owner','daily.start',{driverId:f.actors.driver.id,vehicleId:f.v.id,openingKg:10,startOdometer:10});
 const first=await f.make(6);await f.assign(first);assert.equal(Number((await f.summary()).committed_grams),6000);assert((await f.snapshot(first.id)).daily_run);
 const second=await f.make(6);await f.transition(second,'accepted');await f.transition(second,'preparing');const old=await f.snapshot(second.id), stock=await one(f.db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'");
 await assert.rejects(()=>f.transition(second,'assigned'),/enough gas|insufficient/i);const now=await f.snapshot(second.id);assert.equal(now.driver_id,null);assert.equal(now.status,'preparing');assert.equal(now.tracking_version,old.tracking_version);assert.equal(now.daily_run,null);assert.deepEqual(await one(f.db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'"),stock);assert.equal(Number((await f.summary()).committed_grams),6000);
 }finally{await f.db.close?.();}
});
test('DAYASSIGN-RECOVER same-driver older order attaches in one action and ordinary dispatch.reassign also reserves automatically',async()=>{
 const f=await mismatched();try{
 const before=await f.snapshot(f.o.id);await f.run('owner','dispatch.reassign',{orderId:f.o.id,driverId:f.actors.today.id,version:before.tracking_version,reason:'Synthetic office reassignment before departure'});assert((await f.snapshot(f.o.id)).daily_run);
 // Reproduce an older assigned order with only its branch reservation.
 const day=await f.summary();await f.db.query("UPDATE daily_delivery_allocations SET state='released' WHERE order_id=$1",[f.o.id]);await f.db.query('UPDATE daily_delivery_runs SET committed_grams=0,version=version+1 WHERE id=$1',[day.id]);await f.db.query("UPDATE gas_stock SET reserved_grams=reserved_grams+12500 WHERE branch_id='lagos'");
 const o=await f.snapshot(f.o.id);await f.run('owner','dispatch.assignToday',{orderId:o.id,runId:day.id,version:o.tracking_version});assert.equal(Number((await f.summary()).committed_grams),12500);assert.equal((await f.db.query("SELECT id FROM daily_delivery_allocations WHERE order_id=$1 AND state='allocated'",[o.id])).rows.length,1);
 }finally{await f.db.close?.();}
});

test('DAYASSIGN-GUARDS current-day choices, missing identity, revoked Dispatch privilege and release switches prevent bypass',async()=>{
 const f=await mismatched();try{
 const before=await balances(f),req={orderId:f.o.id,runId:before.run.id,version:before.order.tracking_version};
 const fresh=await f.make(6);const candidates=await f.call('owner','dispatch.candidates',{orderId:fresh.id});assert.equal(candidates.candidates.find((d:any)=>d.id===f.actors.driver.id).readiness.ready,false);assert.equal(candidates.candidates.find((d:any)=>d.id===f.actors.today.id).readiness.ready,true);
 await assert.rejects(()=>f.call('owner','dispatch.assignToday',req),/operationKey/);
 await f.db.query("INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'dispatch.manage','deny',$1,'owner','lagos')",[f.actors.owner.id]);await assert.rejects(()=>f.run('owner','dispatch.assignToday',req),/revoked/);await f.db.query("DELETE FROM staff_privilege_overrides WHERE user_id=$1",[f.actors.owner.id]);
 process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED='false';try{await assert.rejects(()=>f.run('owner','dispatch.assignToday',req),/disabled/);}finally{process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED='true';}
 const priorEnv=process.env.NODE_ENV,priorField=process.env.EASYGAS_FIELD_OPERATIONS_ENABLED;process.env.NODE_ENV='production';process.env.EASYGAS_FIELD_OPERATIONS_ENABLED='false';try{await assert.rejects(()=>f.run('owner','dispatch.assignToday',req),/release approval/);}finally{process.env.NODE_ENV=priorEnv;process.env.EASYGAS_FIELD_OPERATIONS_ENABLED=priorField;}
 await assert.rejects(()=>f.run('owner','dispatch.assignToday',{...req,driverId:f.actors.driver.id}));
 const after=await balances(f);assert.deepEqual(after.run,before.run);assert.deepEqual(after.order,before.order);assert.deepEqual(after.alloc,before.alloc);assert.equal(Number(after.stock?.reserved_grams),Number(before.stock?.reserved_grams)+6000);
 }finally{await f.db.close?.();}
});


test('DAYASSIGN-PAYMENT a phone order with no verified payment/profile cannot be assigned or reserve daily gas',async()=>{
 const {phonePaymentFixture}=await import('./helpers/phone-order-payment-fixture');
 const p=await phonePaymentFixture();const f=await setup(p.db,p);try{
 await f.start();const made=await p.makePhone(false);const o=await f.snapshot(made.o.id);const day=await f.summary();const stock=await one(f.db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'");
 await assert.rejects(()=>f.run('owner','dispatch.assignToday',{orderId:o.id,runId:day.id,version:o.tracking_version}),/payment|pay|details/i);
 const after=await f.snapshot(o.id);assert.equal(after.driver_id,null);assert.equal(after.daily_run,null);assert.equal(after.status,o.status);assert.equal(Number((await f.summary()).committed_grams),0);assert.deepEqual(await one(f.db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'"),stock);
 }finally{await f.db.close?.();}
});
