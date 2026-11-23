// Loopback-only disposable synthetic testimonials; never reads or writes hosted data.
import next from 'next';
import {createServer} from 'node:http';
import {mkdtemp,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fixture} from '../tests/helpers/service-fixture';
import {id,hashPassword} from '../apps/web/lib/auth';
if(process.env.DATABASE_URL||process.env.NODE_ENV==='production')throw Error('Disposable local fixture only');
const dir=await mkdtemp(join(tmpdir(),'easygas-testimonial-ui-')),f=await fixture(join(dir,'db')),db=f.db;
const password='Synthetic-feedback-ui-only-123!';
await db.query("UPDATE users SET email=$1,password_hash=$2,verified=true WHERE id=$3",['owner@feedback-ui.example.test',hashPassword(password),f.actors.owner.id]);
await db.query("UPDATE users SET email=$1,password_hash=$2,verified=true WHERE id=$3",['customer@feedback-ui.example.test',hashPassword(password),f.actors.customer.id]);
await db.exec("UPDATE settings SET value=jsonb_set(jsonb_set(value,'{notificationsEnabled}','false'),'{dailyLimit}','10') WHERE key='testimonials.policy'");
const states=['DRAFT','PENDING_REVIEW','APPROVED','PUBLISHED','HIDDEN','CHANGES_REQUESTED','WITHDRAWN'];
const records:any[]=[];
for(const state of states){
 const oid=id();await db.query("INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$2,$3,'lagos','delivered','verified','synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-24','AM',$1,'synthetic')",[oid,'SYNTHETIC-FEEDBACK-'+state,f.actors.customer.id]);
 await db.query("INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'cash',$3)",[id(),oid,f.actors.finance.id]);
 let row=await f.call('customer','testimonial.create',{orderId:oid,content:{rating:4,displayName:'Synthetic QA '+state.replaceAll('_',' '),nameStyle:'custom',consent:true,body:'Synthetic QA only. This review exists solely to test the feedback display and moderation journey.'}});
 if(state!=='DRAFT'&&state!=='WITHDRAWN')row=await f.call('customer','testimonial.transition',{id:row.id,revision:row.revision,status:'PENDING_REVIEW'});
 if(['APPROVED','PUBLISHED','HIDDEN'].includes(state))row=await f.call('owner','testimonial.transition',{id:row.id,revision:row.revision,status:'APPROVED',reason:'Synthetic QA only: original version reviewed'});
 if(state==='PUBLISHED')row=await f.call('owner','testimonial.transition',{id:row.id,revision:row.revision,status:'PUBLISHED',reason:'Synthetic local publication acceptance only'});
 if(state==='HIDDEN'||state==='CHANGES_REQUESTED')row=await f.call('owner','testimonial.transition',{id:row.id,revision:row.revision,status:state,reason:'Synthetic local state acceptance only'});
 if(state==='WITHDRAWN')row=await f.call('customer','testimonial.transition',{id:row.id,revision:row.revision,status:state});
 records.push({id:row.id,state});
}
(globalThis as any).easygasDb=Promise.resolve(db);(globalThis as any).easygasLocalVersion=82;
process.env.EASYGAS_BACKGROUND_JOBS='false';process.env.EASYGAS_DATA_DIR=join(dir,'db');process.env.EASYGAS_CLIENT_DEMO='true';
const app=next({dev:true,hostname:'127.0.0.1',port:3132,dir:'apps/web',conf:{distDir:'.next-testimonial-ui',serverExternalPackages:['@electric-sql/pglite','pg']}});await app.prepare();
await writeFile('.data/testimonial-ui-qa.json',JSON.stringify({dir,password,ownerEmail:'owner@feedback-ui.example.test',customerEmail:'customer@feedback-ui.example.test',records}),{mode:0o600});
createServer(app.getRequestHandler()).listen(3132,'127.0.0.1',()=>console.log('Synthetic testimonial QA ready: http://127.0.0.1:3132/admin/testimonials'));
