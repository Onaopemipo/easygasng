import test from 'node:test';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { createDatabase,one } from '../apps/web/lib/db';
import { id } from '../apps/web/lib/auth';
import { mismatched } from './helpers/daily-assignment-fixture';
test('DAYASSIGN-PG real concurrent reassign/retries and competing orders reserve once without oversubscribing measured gas',{
 skip:!process.env.EASYGAS_TEST_POSTGRES_URL && 'Explicit disposable local PostgreSQL required'
},async()=>{
 const url=new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);assert(['localhost','127.0.0.1'].includes(url.hostname));assert.equal(url.pathname,'/easygas_daily_qa');
 const adminURL=new URL(url);adminURL.pathname='/postgres';const admin=new Pool({connectionString:adminURL.toString()});const name='easygas_dayassign_qa_'+Date.now();await admin.query('CREATE DATABASE '+name);url.pathname='/'+name;process.env.DATABASE_URL=url.toString();process.env.NODE_ENV='test';
 const db=await createDatabase();try{
 const f=await mismatched(db);const o=await f.snapshot(f.o.id),run=await f.summary();const req={orderId:o.id,runId:run.id,version:o.tracking_version,operationKey:id()};
 const other={...req,operationKey:id()};const outcomes=await Promise.allSettled([f.call('owner','dispatch.assignToday',req),f.call('owner','dispatch.assignToday',other)]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);
 assert.equal(Number((await f.summary()).committed_grams),12500);assert.equal(Number((await one(db,"SELECT count(*) n FROM daily_delivery_allocations WHERE order_id=$1 AND state='allocated'",[o.id]))?.n),1);
 const winner=outcomes[0].status==='fulfilled'?req:other;const replay=await Promise.all([f.call('owner','dispatch.assignToday',winner),f.call('owner','dispatch.assignToday',winner)]);assert(replay.every(x=>x.replayed));
 const a=await f.make(12.5),b=await f.make(12.5);const aa=await f.snapshot(a.id),bb=await f.snapshot(b.id);const before=await one(db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'");
 const both=await Promise.allSettled([f.run('owner','dispatch.assignToday',{orderId:a.id,runId:run.id,version:aa.tracking_version}),f.run('owner','dispatch.assignToday',{orderId:b.id,runId:run.id,version:bb.tracking_version})]);assert.equal(both.filter(x=>x.status==='fulfilled').length,1);assert.equal(both.filter(x=>x.status==='rejected').length,1);
 const after=await one(db,"SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'");assert.equal(Number(after?.grams),Number(before?.grams));assert.equal(Number(before?.reserved_grams)-Number(after?.reserved_grams),12500);assert.equal(Number((await f.summary()).committed_grams),25000);
 const loser=both[0].status==='rejected'?await f.snapshot(a.id):await f.snapshot(b.id);assert.equal(loser.status,'placed');assert.equal(loser.driver_id,null);assert.equal(loser.daily_run,null);
 }finally{await db.close?.();await admin.query('DROP DATABASE '+name);await admin.end();}
});
