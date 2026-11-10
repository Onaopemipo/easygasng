import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { digest, id, passwordMatches } from "../apps/web/lib/auth";
import { accountPassword } from "../apps/web/lib/password-policy";

test("PW-MIN01: eight-character registration, login, change and reset work while short passwords, wrong current password and token replay fail",async()=>{
 const db=await createDatabase('memory://');await migrate(db);
 try{const email=`${id()}@password-policy.test`,password='Eight-1!';
 assert.equal(accountPassword.safeParse('a'.repeat(8)).success,true);assert.equal(accountPassword.safeParse('a'.repeat(128)).success,true);assert.equal(accountPassword.safeParse('a'.repeat(129)).success,false);
 await assert.rejects(()=>dispatch('register',null,{name:'Synthetic test',email,password:'Seven1!'},db),/at least 8/);
 assert.equal(Number((await one(db,'SELECT count(*) n FROM users WHERE email=$1',[email]))!.n),0);
 const registered=await dispatch('register',null,{name:'Synthetic test',email,password},db);assert.ok(registered.token);
 const logged=await dispatch('login',null,{email,password},db);assert.ok(logged.token);
 const user=await one(db,'SELECT id,password_hash FROM users WHERE email=$1',[email]);assert.ok(passwordMatches(password,user!.password_hash));
 await assert.rejects(()=>dispatch('account.password',logged.token,{currentPassword:password,newPassword:'Seven1!'},db),/at least 8/);
 await assert.rejects(()=>dispatch('account.password',logged.token,{currentPassword:'Wrong-1!',newPassword:'Change2!'},db),/verification failed/);
 await dispatch('account.password',logged.token,{currentPassword:password,newPassword:'Change2!'},db);
 await assert.rejects(()=>dispatch('me',logged.token,{},db),/sign in|session|expired|authentication/i);
 const changed=await dispatch('login',null,{email,password:'Change2!'},db);assert.ok(changed.token);
 const raw='a'.repeat(64);await db.query("INSERT INTO account_challenges(id,user_id,purpose,token_hash,expires_at) VALUES($1,$2,'reset',$3,now()+interval '15 minutes')",[id(),user!.id,digest(raw)]);
 await assert.rejects(()=>dispatch('account.reset',null,{token:raw,password:'Seven1!'},db),/at least 8/);
 await dispatch('account.reset',null,{token:raw,password:'Reset-3!'},db);
 assert.ok((await dispatch('login',null,{email,password:'Reset-3!'},db)).token);
 await assert.rejects(()=>dispatch('account.reset',null,{token:raw,password:'Reset-4!'},db),/expired|already been used/);
 }finally{await db.close?.();}
});
test("PW-MIN02: all account entry points use the shared eight-character policy and retain separate backup encryption rules",async()=>{
 for(const file of ['apps/web/lib/service.ts','apps/web/lib/accounts.ts','apps/web/lib/phone-activation.ts']){const source=await readFile(file,'utf8');assert.match(source,/accountPassword/);assert.doesNotMatch(source,/\.min\(12\)/);}
 for(const file of ['apps/web/components/site.tsx','apps/web/components/phone-completion.tsx','apps/web/components/workflows.tsx','apps/mobile/App.tsx','apps/mobile/DriverWorkspace.tsx','apps/mobile/Workflows.tsx','scripts/create-owner.ts','scripts/bootstrap-team.ts']){const source=await readFile(file,'utf8');assert.match(source,/PASSWORD_MIN_LENGTH/);assert.doesNotMatch(source,/at least ?12 characters|12\+ characters|minLength=\{12\}|password.length < 12/);}
 assert.match(await readFile('apps/web/lib/backups.ts','utf8'),/password.length < 16/);
});
