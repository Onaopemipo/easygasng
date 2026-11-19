import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile}from'node:fs/promises';
import {client,hash}from'./demo-role-acceptance-client.mjs';
const root='docs/user-manual/evidence/';
test('UM-ROLE-BOUNDS: normal hosted reads preserve role boundaries and existing business records',async()=>{
 const c=await client();const checks=[];
 for(const[role,action,status]of [['','orders',401],['','navigation.access',401],['customer','approvals',403],['customer','drivers.workspace',403],['driver','finance.ledger',403],['driver','technician.snapshot',403],['technician','drivers.workspace',403],['manager','finance.ledger',403],['finance','staff.manage',403],['owner','orders',200],['manager','orders',200],['finance','finance.ledger',200],['driver','orders',200],['technician','technician.snapshot',200],['customer','orders',200]]){
  const r=await c.call(role,action);assert.equal(r.status,status,role+' '+action);checks.push({role:role||'anonymous',action,status:r.status,expected:status});
 }
 const after={orders:await c.ok('owner','orders'),ledger:await c.ok('finance','finance.ledger'),inventory:await c.ok('inventory','inventory'),gas:(await c.ok('inventory','inventory.workspace')).gas,wallet:await c.ok('customer','wallet'),policy:(await c.ok('owner','settings?scope=lagos')).filter(s=>s.key==='loyalty.policy').map(s=>({key:s.key,value:s.value,version:s.version}))};
 const before=JSON.parse(await readFile('.data/user-manual-before.json','utf8'));assert.deepEqual(after,before);
 await writeFile(root+'role-boundaries.json',JSON.stringify({checkedAt:new Date().toISOString(),checks,businessUnchanged:true,orders:after.orders.length,hashes:Object.fromEntries(Object.entries(after).map(([k,v])=>[k+'Hash',hash(v)]))},null,2)+'\n');
});
