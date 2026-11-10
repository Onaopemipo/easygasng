import test from 'node:test';import assert from 'node:assert/strict';import{readFile,writeFile,chmod}from'node:fs/promises';
const file='.data/demo-test-logins-20261110.json',base='https://easygas-client-demo.vercel.app';
test('DEMO-LOGIN01: thirteen new synthetic hosted accounts authenticate with correct identities and customer privilege rejection',async()=>{
 const m=JSON.parse(await readFile(file,'utf8'));assert.equal(m.accounts.length,13);const results=[];
 for(const a of m.accounts){const r=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json',origin:base,'x-easygas-client':'native'},body:JSON.stringify({email:a.email,password:a.password})});assert.equal(r.status,200,`Login failed for ${a.role}`);const b=await r.json();assert.ok(b.token);assert.equal(b.role,a.role);
 const headers={authorization:'Bearer '+b.token,'x-easygas-client':'native'};const me=await fetch(base+'/api/me',{headers});assert.equal(me.status,200);const identity=await me.json();assert.equal(identity.user.id,a.id);assert.equal(identity.user.role,a.role);
 if(a.role==='customer'||a.role==='commercial'){const denied=await fetch(base+'/api/admin.dashboard?from=2026-11-01&to=2026-11-30',{headers});assert.equal(denied.status,403);}
 results.push({role:a.role,login:200,identityVerified:true});console.log('PASS fresh '+a.role+' hosted login and identity');
 }
 await writeFile('docs/demo-accounts/evidence/hosted-results.json',JSON.stringify(results,null,2));
 const guide='# Fresh EasyGas demo logins — 10 November 2026\n\nSign in: https://easygas-client-demo.vercel.app/login\n\nThese are synthetic client-demo accounts. Do not use real customer data or live payments. Existing accounts are unchanged. Driver/technician safety qualifications and assignment controls remain; these new accounts start without invented certifications.\n\n| Role | Email | Password |\n|---|---|---|\n'+m.accounts.map(a=>`| ${a.role} | ${a.email} | ${a.password} |`).join('\n')+'\n\nUse a private/incognito window when switching roles. Copy the password exactly, without surrounding spaces. Staff access is determined automatically after sign-in.\n';
 await writeFile('.data/demo-test-logins-20261110.md',guide,{mode:0o600});await chmod('.data/demo-test-logins-20261110.md',0o600);
});
