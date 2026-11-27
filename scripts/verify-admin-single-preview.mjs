// Read-only proof of the actual disposable browser mutation. Never contacts hosted systems.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base='http://127.0.0.1:3120';
const qa=JSON.parse(await readFile('.data/settings-acceptance-qa.json','utf8'));
const login=await fetch(base+'/api/login',{method:'POST',headers:{'content-type':'application/json','origin':base},body:JSON.stringify({email:qa.email,password:qa.password})});
const cookie=login.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');assert.ok(login.ok&&cookie);
const get=async(action,args)=>{const r=await fetch(base+'/api/'+action+(args?'?'+new URLSearchParams(args):''),{headers:{cookie}});const b=await r.json();if(!r.ok)throw Error(action+': '+JSON.stringify(b));return b.data??b;};
try{
 const settings=await get('settings',{scope:'lagos'}),gateway=settings.find(s=>s.key==='payment.gateway');assert.equal(gateway.version,2);assert.equal(gateway.value.fee.fixedKobo,11000);
 const policies=await get('policies.manage');assert.equal(policies.length,9);assert.ok(policies.every(p=>p.owner_auto_approval));
 const requests=await get('approvals');const req=requests.find(r=>r.key==='payment.gateway'&&r.status==='active');assert.ok(req);assert.equal(req.approval_progress.required,1);assert.equal(req.approval_progress.complete,true);assert.equal(req.decisions.length,0);
 const result={status:'PASS',environment:'Disposable local fixture only',source:'Actual browser form, then read-only canonical settings/request confirmation',key:gateway.key,version:gateway.version,fixedFeeKobo:gateway.value.fee.fixedKobo,requestId:req.id,policyMetadataConfirmed:true,requiredApprovals:req.approval_progress.required,complete:req.approval_progress.complete,additionalColleagueDecisions:req.decisions.length,screenshot:'docs/admin-single-approval/evidence/admin-setting-applied.jpg'};
 await writeFile('docs/admin-single-approval/evidence/browser-result.json',JSON.stringify(result,null,2)+'\n');console.log('PASS: actual high-risk Admin change is version2, final approval complete, no colleague decisions.');
}finally{await fetch(base+'/api/logout',{method:'POST',headers:{cookie,origin:base}});}
