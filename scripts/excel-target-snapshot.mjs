// Audit a stopped-application copy only. Never imports getDb(), migrations or workers.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve('.data/excel-preview/761854f961474cfb');
const copy=path.join(root,'target-copy');
if((await fs.lstat(copy)).isSymbolicLink())throw new Error('Snapshot must be a real isolated copy, never a symlink');
await fs.access(path.join(copy,'PG_VERSION'));
const db=await PGlite.create(copy);
try {
 const result=await db.transaction(async tx=>{
  await tx.exec('SET TRANSACTION READ ONLY');
  const query=async q=>(await tx.query(q)).rows;
  const schemas=await query("SELECT version FROM schema_migrations ORDER BY version");
  const customers=await query("SELECT id,public_customer_id,name,active,role,branch_id,contact_phone,phone_verified_at,verified,provisional FROM users WHERE role IN ('customer','commercial') ORDER BY id");
  const addresses=await query('SELECT customer_id,street,zone,phone,archived FROM account_addresses');
  const products=await query('SELECT id,name,category,size_kg,archived FROM products ORDER BY id');
  const gasStock=await query('SELECT * FROM gas_stock ORDER BY branch_id');
  const inventory=await query('SELECT branch_id,product_id,quantity,reserved FROM inventory ORDER BY branch_id,product_id');
  const branches=await query('SELECT id,name,active FROM branches ORDER BY id');
  const counts={}; for(const table of ['users','account_addresses','orders','order_items','order_gas_lines','verified_payments','credit_requests','wallet_entries','customer_invoices','stock_movements','gas_stock_movements','cylinders','cylinder_custody','consumption_profiles','refill_history','service_bookings','notifications','message_outbox','reward_entries','audit_events']){
   const exists=(await tx.query('SELECT to_regclass($1) AS t',[table])).rows[0]?.t;
   if(exists)counts[table]=(await tx.query(`SELECT count(*)::text AS n FROM ${table}`)).rows[0].n;
  }
  const totals=await query("SELECT (SELECT coalesce(sum(total_kobo),0)::text FROM orders) AS order_total_kobo,(SELECT coalesce(sum(amount_kobo),0)::text FROM verified_payments) AS verified_payment_kobo,(SELECT coalesce(sum(amount_kobo),0)::text FROM wallet_entries) AS wallet_kobo");
  return {capturedAt:new Date().toISOString(),mode:'READ_ONLY transaction against isolated local copy; no original database connection',schemas,customers,addresses,products,gasStock,inventory,branches,counts,totals};
 });
 const beforeCounts=result.counts;
 let writeRejected=false;
 try{await db.transaction(async tx=>{await tx.exec('SET TRANSACTION READ ONLY');await tx.exec('DELETE FROM users WHERE false');});}catch(e){writeRejected=e.code==='25006'||/read.only/i.test(e.message);}
 if(!writeRejected)throw new Error('Read-only transaction guard failed');
 result.afterReadOnlyCounts=await db.transaction(async tx=>{await tx.exec('SET TRANSACTION READ ONLY');const counts={};for(const table of Object.keys(beforeCounts))counts[table]=(await tx.query(`SELECT count(*)::text AS n FROM ${table}`)).rows[0].n;return counts;});
 if(JSON.stringify(result.afterReadOnlyCounts)!==JSON.stringify(beforeCounts))throw new Error('Logical target-copy counts changed');
 result.businessCountDeltas=Object.fromEntries(Object.keys(beforeCounts).map(t=>[t,0]));
 result.readOnlyWriteAttemptRejected=true;
 result.originalFingerprint=JSON.parse(await fs.readFile(path.join(root,'snapshot-fingerprint.json'),'utf8'));
 await fs.writeFile(path.join(root,'target-snapshot.json'),JSON.stringify(result,null,2),{mode:0o600});
 console.log(JSON.stringify({tables:beforeCounts,readOnlyWriteAttemptRejected:writeRejected,originalUnchanged:result.originalFingerprint.unchanged}));
}finally{await db.close()}
