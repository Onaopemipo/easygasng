// User approved the exact review packet in this chat on 20 November 2026.
import assert from'node:assert/strict';import{readFile,writeFile}from'node:fs/promises';import{client,hash}from'./demo-role-acceptance-client.mjs';
const c=await client();const approved=JSON.parse(await readFile('docs/audit-remediation/proposed-demo-policies.json','utf8'));
const before=await c.ok('owner','policies.manage');const settings=await c.ok('owner','settings?scope=lagos');
const original=await c.ok('owner','approvals');await writeFile('.data/audit-remediation-approvals.json',JSON.stringify(original),{mode:0o600});
assert.equal(before.length,9);assert.equal(approved.length,9);assert.ok(before.every(p=>p.version===1&&!p.published&&!p.content));
await c.reauth('owner');const effectiveAt=new Date().toISOString();const published=[];
for(const p of approved){const prior=before.find(b=>b.kind===p.kind);const setting=settings.find(s=>s.key==='legal.'+p.kind);assert.ok(setting.owner_auto_approval,'Existing scoped owner authority required');
 const r=await c.ok('owner','setting.propose',{key:'legal.'+p.kind,scope:'lagos',version:prior.version,value:{title:p.title,content:p.content,published:true,effectiveAt},reason:'User-approved exact client-demo-only notice WEB-A01; synthetic demo only; commercial NO-GO retained. Packet '+hash(approved).slice(0,16)});
 assert.equal(r.status,'active');published.push({kind:p.kind,title:p.title,requestId:r.id,previousVersion:prior.version,contentHash:hash(p.content)});
}
const publicRows=await c.ok('','policies');assert.equal(publicRows.length,9);for(const p of approved){const r=publicRows.find(r=>r.kind===p.kind);assert.equal(r.content,p.content);assert.equal(r.version,2);}
await writeFile('docs/audit-remediation/evidence/policy-publication.json',JSON.stringify({testId:'WEB-A01-PUBLISH',status:'PASS',checkedAt:new Date().toISOString(),authorisation:'User approved exact nine demo-only notices in POLICY-REVIEW.md in this chat',packetHash:hash(approved),effectiveAt,published,publicCount:publicRows.length,commercialPoliciesAccepted:false,productionNoGoUnchanged:true},null,2)+'\n');console.log('PASS: nine exact approved demo-only notices published through existing owner workflow and verified publicly.');
