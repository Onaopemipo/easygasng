// Audit-only reproductions. All writes are to an ephemeral in-memory database.
import assert from 'node:assert/strict';
import {createDatabase,migrate,one} from '../../apps/web/lib/db.ts';
import {dispatch} from '../../apps/web/lib/service.ts';
import {id,hashPassword,issueSession} from '../../apps/web/lib/auth.ts';
import {forecast} from '../../packages/business-rules/src/forecast.ts';
delete process.env.DATABASE_URL;
process.env.EASYGAS_BACKGROUND_JOBS='false';
const db=await createDatabase('memory://'); await migrate(db);
const roles:Record<string,{id:string,token:string}>={};
for(const role of ['owner','customer','driver','finance','sales']){
 const uid=id(); await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES ($1,$2,$3,$4,$5,'lagos')",[uid,'Audit fixture',`${uid}@example.test`,hashPassword('Isolated-audit-only-123!'),role]);
 roles[role]={id:uid,token:await issueSession(db,uid)};
}
const call=(role:string,action:string,input:any={})=>dispatch(action,roles[role].token,input,db);
await db.query("UPDATE settings SET value='true' WHERE scope='lagos' AND key IN ('delivery.enabled','payment.cod')");
await db.query("UPDATE inventory SET quantity=30 WHERE branch_id='lagos' AND product_id IN ('refill-6','cylinder-empty-6')");
const input=(productId='refill-6')=>({items:[{productId,quantity:1}],address:{name:'Audit customer',phone:'08012345678',street:'12 Isolated Test Avenue',zone:'Ikoyi'},date:new Date(Date.now()+86400000).toISOString().slice(0,10),window:'14:00–18:00',idempotencyKey:id(),paymentMethod:'cash_on_delivery'});
const outputs:any[]=[];
await db.query("UPDATE branches SET active=false WHERE id='lagos'");
const inactive=await call('customer','checkout',input());
assert.equal(inactive.branch_id,'lagos'); outputs.push({finding:'F01',observed:'Checkout accepted an order for inactive Lagos branch'});
await db.query("UPDATE branches SET active=true WHERE id='lagos'");
await db.query("INSERT INTO branches(id,name) VALUES ('audit-other','Audit other branch')");
await db.query("UPDATE users SET branch_id='audit-other' WHERE id=$1",[roles.sales.id]);
const cross=await call('sales','checkout',input());
assert.equal(cross.branch_id,'lagos'); outputs.push({finding:'F02',observed:'Sales account assigned to other branch created Lagos order'});
const empty=await call('customer','checkout',input('cylinder-empty-6'));
assert.equal((await one(db,'SELECT count(*)::int n FROM cylinders'))!.n,0);
for(const status of ['accepted','preparing','assigned']) await call('owner','order.transition',{id:empty.id,status,note:'Isolated audit workflow',...(status==='assigned'?{driverId:roles.driver.id}:{})});
await call('driver','order.transition',{id:empty.id,status:'out_for_delivery',note:'Isolated audit dispatch'});
const code=(await call('customer','orders')).find((o:any)=>o.id===empty.id).confirmation_code;
await call('driver','delivery.complete',{orderId:empty.id,code,collectedKobo:Number(empty.total_kobo)});
outputs.push({finding:'F03',observed:'Empty-cylinder delivery completed with no serialised cylinders registered or allocated'});
await call('owner','cylinder.create',{serial:'AUDIT-CUSTODY-ONLY',sizeKg:6,ownership:'company',status:'filled',testDue:'2027-10-29',branchId:'lagos'});
const c=await one(db,"SELECT id FROM cylinders WHERE serial='AUDIT-CUSTODY-ONLY'");
await call('owner','cylinder.custody',{id:c!.id,customerId:roles.customer.id,reason:'Audit initial issue'});
const second=id();await db.query("INSERT INTO users(id,name,email,password_hash,role) VALUES ($1,'Other audit customer',$2,$3,'customer')",[second,`${second}@example.test`,hashPassword('Isolated-audit-only-123!')]);
await call('owner','cylinder.custody',{id:c!.id,customerId:second,reason:'Audit issue without return'});
assert.equal((await one(db,'SELECT customer_id FROM cylinders WHERE id=$1',[c!.id]))!.customer_id,second);
outputs.push({finding:'F04',observed:'Cylinder already held by customer reassigned directly to another without recorded return'});
// Independent fixture dates isolate ingestion semantics from time of audit.
for(const offset of [60,40,20]){
 const o=await call('customer','checkout',input());
 await db.query("UPDATE orders SET status='delivered',payment_status='verified' WHERE id=$1",[o.id]);
 await db.query("INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by,created_at) VALUES ($1,$2,$3,$4,'cash',$5,now()-($6::text||' days')::interval)",[id(),o.id,`audit:${o.id}`,o.total_kobo,roles.finance.id,offset]);
 await db.query("INSERT INTO order_events(id,order_id,status,actor_id,note,created_at) VALUES ($1,$2,'delivered',$3,'Synthetic fixture delivery date',now()-($4::text||' days')::interval)",[id(),o.id,roles.driver.id,offset+5]);
}
const p=await call('customer','refill.profile.create',{productId:'refill-6',label:'Audit cylinder',householdSize:2,cookingDays:5});
await call('customer','refill.profiles');
const history=(await db.query("SELECT count(*)::int n FROM refill_history h JOIN verified_payments v ON v.order_id=h.order_id WHERE h.profile_id=$1 AND h.refilled_at=v.created_at",[p.id])).rows[0].n;
assert.equal(history,3); outputs.push({finding:'F05',observed:'All 3 refill timestamps use payment verification dates, not synthetic delivery events 5 days earlier'});
const cases:any[]=[];const now=new Date('2026-10-29T12:00:00Z');
const records=(days:number[],cylinder='a')=>days.map(d=>({date:new Date(+now-d*86400000).toISOString(),kg:6,verified:true,cylinderId:cylinder}));
for(const [name,rs] of [['none',[]],['one',records([20])],['regular',records([60,40,20])],['irregular',records([100,80,5])],['multiple', [...records([60,40,20]),...records([90,45,1],'b')]],['early',records([60,40,20,1])],['long',records([600,400,200])]] as any){cases.push({name,result:forecast(rs,'a',now)});}
outputs.push({forecastCases:cases});
// A failed delivery no longer counts toward capacity; reassignment does not revalidate it.
await db.query("UPDATE settings SET value='1' WHERE key='delivery.capacity' AND scope='lagos'");
const capacityDate=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
const first=await call('customer','checkout',{...input(),date:capacityDate});
for(const status of ['accepted','preparing','assigned']) await call('owner','order.transition',{id:first.id,status,note:'Audit capacity workflow',...(status==='assigned'?{driverId:roles.driver.id}:{})});
await call('driver','order.transition',{id:first.id,status:'out_for_delivery',note:'Audit capacity dispatch'});
await call('driver','order.transition',{id:first.id,status:'delivery_failed',note:'Audit failed delivery'});
await call('customer','checkout',{...input(),date:capacityDate});
await call('owner','order.transition',{id:first.id,status:'assigned',driverId:roles.driver.id,note:'Audit reassignment after capacity filled'});
const active=(await one(db,"SELECT count(*)::int n FROM orders WHERE delivery_date=$1 AND status NOT IN ('cancelled','delivery_failed')",[capacityDate]))!.n;
assert.equal(active,2);outputs.push({finding:'F06',observed:'Delivery reassignment restored 2 active orders into a window configured for capacity 1'});
console.log(JSON.stringify({scope:'ephemeral memory database only',findings:outputs},null,2));
await db.close?.();
