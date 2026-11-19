// Disposable synthetic presentation data. No hosted resources or physical fulfilment claims.
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../tests/helpers/order-tracking-fixture';
import {createDatabase} from '../apps/web/lib/db';
import {id,hashPassword} from '../apps/web/lib/auth';
if(process.env.DATABASE_URL||process.env.NODE_ENV==='production')throw Error('Local disposable fixture only');
const dir=await mkdtemp(join(tmpdir(),'easygas-order-modal-'));const f=await fixture(await createDatabase(join(dir,'db')));
try{
 await f.db.query("UPDATE users SET email='owner@order-modal.example.test',name='Synthetic order reviewer',verified=true WHERE id=$1",[f.actors.owner.id]);
 await f.db.query("UPDATE users SET name='Synthetic customer' WHERE id=$1",[f.actors.customer.id]);
 await f.db.query("UPDATE settings SET value=$1 WHERE key='gas.quantity_policy'",[JSON.stringify({minimumKg:1,maximumKg:25,incrementKg:0.5,precision:1,capacitiesKg:[6,12.5,25]})]);
 await f.db.query("UPDATE gas_stock SET grams=100000,reserved_grams=0 WHERE branch_id='lagos'");
 const quote=await f.call('customer','gas.quote',{lines:[{capacityKg:6,kg:6}],locationId:'lekki'});
 const gas=await f.call('customer','checkout',{items:[],gasLines:[{capacityKg:6,kg:6}],pricing:{priceVersion:quote.priceVersion,feeVersion:quote.feeVersion,policyVersion:quote.policyVersion,totalKobo:quote.subtotalKobo+quote.deliveryKobo},address:{name:'Synthetic customer',phone:'08012345678',street:'12 Synthetic Street',zone:'Lekki'},date:new Date(Date.now()+3*86400000).toISOString().slice(0,10),window:'14:00–18:00',paymentMethod:'cash_on_delivery',idempotencyKey:id()});
 await f.db.query("UPDATE orders SET reference='EG-QA-DELIVERED',status='delivered',payment_status='verified',driver_id=$2 WHERE id=$1",[gas.id,f.actors.driver.id]);
 await f.db.query("UPDATE order_gas_lines SET inspected_at=now() WHERE order_id=$1",[gas.id]);
 await f.db.query("INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) SELECT $2,id,$2,total_kobo,'synthetic_test',$3 FROM orders WHERE id=$1",[gas.id,id(),f.actors.owner.id]);
 await f.call('owner','reauth',{password:'Tracking-fixture-only-123!'});await f.call('owner','invoice.issue',{orderId:gas.id});
 for(let n=0;n<12;n++)await f.db.query("INSERT INTO order_events(id,order_id,actor_id,status,note,version) VALUES($1,$2,$3,'accepted',$4,$5)",[id(),gas.id,f.actors.owner.id,`Synthetic retained event ${n+1}; visual fixture only.`,n+1]);
 const placed=await f.make();await f.db.query("UPDATE orders SET reference='EG-QA-PLACED' WHERE id=$1",[placed.id]);
 const preparing=await f.make();await f.db.query("UPDATE orders SET reference='EG-QA-PREPARING',status='preparing' WHERE id=$1",[preparing.id]);
 const phone=await f.make();const uid=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id,provisional,contact_phone,verified) VALUES($1,'Synthetic phone customer',$2,$3,'customer','lagos',true,'+2348012345679',true)",[uid,`${uid}@order-modal.example.test`,hashPassword('Synthetic-phone-only-123!')]);await f.db.query("UPDATE orders SET customer_id=$2,reference='EG-QA-PHONE' WHERE id=$1",[phone.id,uid]);
 await writeFile('.data/admin-order-modal-qa.json',JSON.stringify({db:join(dir,'db'),email:'owner@order-modal.example.test',password:'Tracking-fixture-only-123!',orders:{delivered:gas.id,placed:placed.id,preparing:preparing.id,phone:phone.id}}),{mode:0o600});
 console.log('Prepared four isolated synthetic order states, canonical invoice/payment source and twelve synthetic historical events. Private login saved outside source.');
}finally{await f.db.close?.();}
