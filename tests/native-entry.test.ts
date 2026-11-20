import test from 'node:test';import assert from 'node:assert/strict';
import {nativeEntryLink} from '../packages/business-rules/src/native-entry-links';
import {fixture} from './helpers/order-tracking-fixture';
import {GET,POST} from '../apps/web/app/api/[action]/route';
import {NextRequest} from 'next/server';
import {id,digest} from '../apps/web/lib/auth';
import {one} from '../apps/web/lib/db';
const origin='https://easygas-client-demo.vercel.app',raw='a'.repeat(64);
test('NATIVE-ENTRY-LINK: configured-origin and app account links only; fragments, missing tokens, lookalikes and payment returns stay distinct',()=>{
 for(const[path,kind]of [['reset-password','reset'],['verify-email','verify'],['accept-invitation','invitation'],['activate','phone']] as const){for(const prefix of [origin+'/','easygas://'])assert.deepEqual(nativeEntryLink(prefix+path+'#token='+raw,origin),{kind,token:raw});}
 assert.deepEqual(nativeEntryLink(origin+'/activate#'+raw,origin),{kind:'phone',token:raw});
 assert.equal(nativeEntryLink(origin+'/verify-email',origin)?.token,null);
 for(const url of ['https://evil.test/verify-email#'+raw,'https://easygas-client-demo.vercel.app.evil.test/reset-password#'+raw,'easygas://owner@verify-email#'+raw,'easygas://verify-email:123#'+raw,origin+'/payment?token='+raw,origin+'/orders/'+raw,'javascript:alert(1)','easygas://verify-email/other#'+raw])assert.equal(nativeEntryLink(url,origin),null);
 assert.equal(nativeEntryLink('http://127.0.0.1:3106/reset-password#'+raw,'http://127.0.0.1:3106')?.kind,'reset');
 assert.equal(nativeEntryLink('http://127.0.0.1:3003/reset-password#'+raw,'http://127.0.0.1:3106'),null);
});
test('NATIVE-ENTRY-HTTP: public native verify/reset use canonical single-use challenges, revoke old sessions and reject expired or forged links',async()=>{
 const f=await fixture();(globalThis as any).easygasDb=Promise.resolve(f.db);
 const request=async(action:string,data:any,method='POST')=>{const r=await(method==='POST'?POST:GET)(new NextRequest('http://localhost:3003/api/'+action,{method,headers:{'x-easygas-client':'native','content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(data)}:{})}),{params:Promise.resolve({action})});return{status:r.status,body:await r.json()}};
 try{
  const customer=f.actors.customer.id;
  await f.db.query("INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'verify',$3,now()+interval '15 minutes')",[id(),customer,digest(raw)]);
  assert.equal((await request('account.verify',{token:raw})).status,200);assert.equal((await one(f.db,'SELECT verified FROM users WHERE id=$1',[customer]))!.verified,true);
  assert.equal((await request('account.verify',{token:raw})).status,400);
  const reset='b'.repeat(64);await f.db.query("INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'reset',$3,now()+interval '15 minutes')",[id(),customer,digest(reset)]);
  assert.equal((await request('account.reset',{token:reset,password:'Native-reset-fixture-123!'})).status,200);await assert.rejects(()=>f.call('customer','me'),{status:401});
  assert.equal((await request('account.reset',{token:reset,password:'Native-replay-fixture-123!'})).status,400);
  const expired='c'.repeat(64);await f.db.query("INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'verify',$3,now()-interval '1 second')",[id(),customer,digest(expired)]);
  assert.equal((await request('account.verify',{token:expired})).status,400);assert.equal((await request('account.verify',{token:'forged'})).status,400);assert.equal((await request('account.reset',{},'GET')).status,405);
  const invalidPhone=await request('phone.review',{token:raw,code:'000000'});assert.equal(invalidPhone.body.ok,false);assert.ok(!invalidPhone.body.order);assert.equal((await request('invitation.accept',{token:raw,password:'Native-temporary-fixture-123!'})).status,400);
  assert.equal((await one(f.db,"SELECT count(*)::int n FROM account_challenges WHERE consumed_at IS NOT NULL"))!.n,2);
 }finally{delete(globalThis as any).easygasDb;await f.db.close?.()}
});
