import test from 'node:test';import assert from 'node:assert/strict';
import{createDatabase,migrate,one}from'../apps/web/lib/db';
import{dispatch}from'../apps/web/lib/service';
import{id,hashPassword,issueSession}from'../apps/web/lib/auth';
test('DATE-01: payment-setting proposals accept Lagos offsets and UTC without activation; naive, invalid and out-of-window dates fail',async()=>{
 const db=await createDatabase('memory://');await migrate(db);
 try{const uid=id(),password='Datetime-test-123!';await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic finance',$2,$3,'finance','lagos')",[uid,`${uid}@example.test`,hashPassword(password)]);const token=await issueSession(db,uid);await dispatch('reauth',token,{password},db);
 const setting=await one(db,"SELECT value,version FROM settings WHERE key='payment.gateway' AND scope='lagos'");
 const input={key:'payment.gateway',scope:'lagos',version:setting!.version,value:{...setting!.value,walletFunding:true},reason:'Synthetic date-format regression only',draft:true};
 const utc=new Date(Date.now()+86400000);utc.setMilliseconds(0);
 const lagos=new Date(utc.getTime()+3600000).toISOString().slice(0,-5)+'+01:00';
 for(const effectiveAt of [utc.toISOString(),lagos]){
  const r=await dispatch('setting.propose',token,{...input,effectiveAt},db);const stored=await one(db,'SELECT effective_at,status FROM change_requests WHERE id=$1',[r.id]);assert.equal(new Date(stored!.effective_at).getTime(),utc.getTime());assert.notEqual(stored!.status,'active');
 }
 const before=Number((await one(db,'SELECT count(*) n FROM change_requests'))!.n);
 for(const effectiveAt of ['2026-02-30T10:00:00+01:00','2026-11-10T12:00:00','not-a-date',new Date(Date.now()+8*86400000).toISOString()])await assert.rejects(()=>dispatch('setting.propose',token,{...input,effectiveAt},db),/datetime|date/i);
 assert.equal(Number((await one(db,'SELECT count(*) n FROM change_requests'))!.n),before);
 const after=await one(db,"SELECT value,version FROM settings WHERE key='payment.gateway' AND scope='lagos'");assert.deepEqual(after,setting);
 }finally{await db.close?.();}
});
