// Read-only verification of browser actions against the disposable local fixture.
import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const qa=JSON.parse(await fs.readFile('.data/settings-modal-qa.json','utf8')),base='http://127.0.0.1:3120';let token;
async function call(action,body){const r=await fetch(base+'/api/'+action,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin:base,...(token?{authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});assert.equal(r.status,200,action+' HTTP '+r.status);return r.json()}
try{token=(await call('login',{email:qa.email,password:qa.password})).token;assert.ok(token);const settings=await call('settings?scope=lagos'),requests=await call('approvals'),staff=await call('staff.manage');
 const gas=settings.find(s=>s.key==='gas.price_per_kg');assert.equal(gas.value,180029);assert.equal(gas.version,2);
 assert.equal(requests.filter(r=>r.reason==='Synthetic explicit-review gate regression').length,0);
 assert.equal(requests.filter(r=>r.reason==='Synthetic compact phone review').length,0);
 assert.equal(requests.filter(r=>r.reason==='Synthetic fractional-currency and identity-check acceptance only').length,1);
 const draft=requests.find(r=>r.reason==='Synthetic acceptance draft only. No account access will change.');assert.equal(draft.status,'draft');
 assert.equal(staff.people.find(p=>p.email==='driver@settings.example.test').role,'driver');
 await fs.writeFile('docs/settings-modal/evidence/browser-api-confirmation.json',JSON.stringify({at:new Date().toISOString(),fixture:'Disposable loopback database only; no hosted records',checks:[{id:'SMOD-REVIEW-NO-WRITE',result:'PASS',detail:'Both final review-only nonces absent from actual approval requests.'},{id:'SMOD-REAUTH-ONCE',result:'PASS',detail:'Wrong password and verification retry produced one successful synthetic price request, one version increment and exact 180029 kobo.'},{id:'SMOD-DRAFT-INACTIVE',result:'PASS',detail:'Staff request is a draft; target account remains Driver.'}]},null,2)+'\n');console.log('PASS: explicit review performs no write; verification saves once with exact kobo; staff draft stays inactive.');
}finally{if(token)await call('logout',{});}
