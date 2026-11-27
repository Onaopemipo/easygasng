import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {settingsFixture} from './helpers/settings-acceptance-fixture';
import {id,hashPassword} from '../apps/web/lib/auth';
const operatorSql=(await readFile('docs/lagos-default/apply-migration084.sql','utf8')).replaceAll('easygas_private','public');
test('LAG-OPERATOR: exact guarded operator SQL commits six backfills only, preserves all other business tables and rejects an unexpected target count',async()=>{
 const f=await settingsFixture();try{
  await f.db.query("DELETE FROM schema_migrations WHERE version='084'");
  for(let n=0;n<6;n++){const uid=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic migration target',$2,$3,'customer',NULL)",[uid,uid+'@migration.invalid',hashPassword(f.password)]);}
  await f.db.exec(operatorSql);
  assert.equal((await f.db.query("SELECT * FROM schema_migrations WHERE version='084'")).rows.length,1);
  assert.equal((await f.db.query("SELECT * FROM users WHERE branch_id IS NULL")).rows.length,0);
  assert.equal((await f.db.query("SELECT * FROM audit_events WHERE action='users.branch.defaulted'")).rows.length,6);
  await assert.rejects(()=>f.db.exec(operatorSql),/already applied/);await f.db.exec('ROLLBACK');
 }finally{await f.db.close?.();}
 const unexpected=await settingsFixture();try{
  await unexpected.db.query("DELETE FROM schema_migrations WHERE version='084'");
  await unexpected.db.query('UPDATE users SET branch_id=NULL WHERE id=$1',[unexpected.actors.customer.id]);
  await assert.rejects(()=>unexpected.db.exec(operatorSql),/exactly six/);await unexpected.db.exec('ROLLBACK');
  assert.equal((await unexpected.db.query('SELECT * FROM users WHERE branch_id IS NULL')).rows.length,1);
  assert.equal((await unexpected.db.query("SELECT * FROM schema_migrations WHERE version='084'")).rows.length,0);
 }finally{await unexpected.db.close?.();}
});
