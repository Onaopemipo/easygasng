/** Pinned demo-only, role-scoped release verification; no business writes. */
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
const exec=promisify(execFile),stage=process.argv[2];assert.ok(['before','candidate','stable','final'].includes(stage));
const origin='https://easygas-client-demo.vercel.app',dir='docs/blocker-reconciliation/evidence/';
const identity=stage==='candidate'?JSON.parse(await fs.readFile(dir+'candidate-identity.json','utf8')):null;
if(identity)assert.equal(identity.projectId,'prj_cFSaJuN9r4x93RLov1LLVO3cdVA2');
const base=identity?'https://'+identity.url:origin;const tokens={},checks=[];const result={stage,base,startedAt:new Date().toISOString(),businessWrites:0,checks};
async function transport(route,opts){
 if(!identity)return fetch(base+route,{...opts,signal:AbortSignal.timeout(30000)});
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-pbr-review-'));
 try{const output=path.join(temp,'response'),config=path.join(temp,'curl.cfg');const lines=['silent','show-error','output = '+JSON.stringify(output),'write-out = "%{http_code}"','request = '+JSON.stringify(opts.method),'max-time = 30'];for(const [k,v]of Object.entries(opts.headers))lines.push('header = '+JSON.stringify(k+': '+v));if(opts.body){const body=path.join(temp,'request');await fs.writeFile(body,opts.body,{mode:0o600});lines.push('data-binary = '+JSON.stringify('@'+body))}await fs.writeFile(config,lines.join('\n')+'\n',{mode:0o600});const r=await exec('vercel',['curl',route,'--deployment',base,'--scope','onaopemipos-projects','--','--config',config],{maxBuffer:250000,timeout:60000});const match=r.stdout.trim().match(/(\d{3})$/);assert.ok(match);const content=await fs.readFile(output,'utf8');return{status:Number(match[1]),json:async()=>JSON.parse(content)};}finally{await fs.rm(temp,{recursive:true,force:true})}
}
async function call(role,action,data){const r=await transport('/api/'+action,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json','x-easygas-client':'native',origin,...(tokens[role]?{authorization:'Bearer '+tokens[role]}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});return{status:r.status,body:await r.json()}}
const ok=async(role,action,data)=>{const r=await call(role,action,data);assert.equal(r.status,200,role+' '+action+' status');return r.body;};
const pass=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log('PASS '+name)};
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).filter(([k])=>!['checkedAt','asOf','generatedAt','observedAt','serverTime'].includes(k)).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>[k,canonical(v)])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
try{
 const staff=(await fs.readFile('.data/demo-staff-logins-qa-ac7e0495.md','utf8')).split('\n').filter(x=>x.startsWith('|')&&x.includes('@')).map(x=>x.split('|').map(x=>x.trim().replaceAll('`','')));
 const accounts=JSON.parse(await fs.readFile('.data/demo-test-logins-20261110.json','utf8')).accounts;
 for(const [role,label]of [['owner','Admin / Business Owner'],['manager','Branch Manager / Sales Rep / Dispatcher / Service Manager'],['finance','Finance / Auditor / Inventory'],['driver','Delivery Driver'],['technician','Service Technician'],['customer',null],['commercial',null]]){
  const a=label?staff.find(x=>x[1]===label):null;const c=a?{email:a[2],password:a[3]}:accounts.find(x=>x.role===role);assert.ok(c);const r=await ok('',role==='driver'||role==='technician'?role+'.login':'login',{email:c.email,password:c.password});tokens[role]=r.token;assert.ok(tokens[role]);assert.equal(r.role,role);pass(role+' existing demo identity');
 }
 const snapshot={};for(const action of ['settings?scope=lagos','inventory','gas.stock','orders','finance.ledger','policies','staff.manage']){
  const v=await ok('owner',action);snapshot[action]=hash(action==='staff.manage'?v.people.map(({id,role,branch_id,active})=>({id,role,branch_id,active})):v);
  if(action==='staff.manage'){const prior=JSON.parse(await fs.readFile('docs/deployment/20261121-web-api-publication/evidence/stable-hosted.json','utf8'));assert.equal(snapshot[action],prior.snapshot.staff.sha256,'Retain prior independently recorded staff authority projection');}
 }
 for(const role of ['customer','commercial'])snapshot[role+'.wallet']=hash(await ok(role,'wallet'));
 result.snapshot=snapshot;result.snapshotScopes={staff:'id,role,branch_id,active; last_login is normal authentication audit activity, not authority'};
 if(stage==='before'){
  const prior=JSON.parse(await fs.readFile('.data/blocker-reconciliation/business-before.json','utf8'));for(const [key,value]of Object.entries(prior))if(key!=='staff.manage')assert.equal(snapshot[key],value,'Preserve original before snapshot '+key);
  await fs.writeFile('.data/blocker-reconciliation/business-before.json',JSON.stringify(snapshot,null,2)+'\n');
 }
 else assert.deepEqual(snapshot,JSON.parse(await fs.readFile('.data/blocker-reconciliation/business-before.json','utf8')));
 pass('settings, inventory, gas, orders, ledger, policies, staff and customer wallets preserved');
 const incidents=await ok('owner','incidents');result.incidents=incidents.map(({id,status,severity,category,target})=>({id,status,severity,category,target}));
 const original=JSON.parse(await fs.readFile(dir+'incidents-before.json','utf8')).incidents;
 const reviewed=JSON.parse(await fs.readFile(dir+'incident-findings.json','utf8'));
 assert.ok(original.every(o=>incidents.some(i=>i.id===o.id&&i.detail===o.detail&&i.target===o.target)));
 pass('all nine original failure records and original details retained');
 if(stage!=='before'){
  const readiness=await ok('owner','production.readiness');result.readiness=readiness;assert.equal(readiness.recommendation,'NO-GO');assert.equal(readiness.gates.length,20);assert.equal(readiness.gates.find(g=>g.id===2).status,'partial');assert.equal(readiness.recordedRelease.ciTests.passed,1137);assert.match(readiness.recordedRelease.limitation,/does not certify later/);assert.match(readiness.gates.find(g=>g.id===4).evidence,/through 081/);assert.match(readiness.gates.find(g=>g.id===18).evidence,/intentionally disables/);assert.match(readiness.gates.find(g=>g.id===19).evidence,/retain-all/);assert.equal(readiness.gates.find(g=>g.id===20).status,'blocked');pass('readiness reflects historical CI, current schema, intentional demo worker and retained production/retention holds');
  for(const role of ['manager','finance','driver','technician','customer','commercial'])assert.equal((await call(role,'production.readiness')).status,403);pass('six non-owner roles denied production readiness');
  for(const role of ['driver','technician','customer','commercial'])assert.equal((await call(role,'incidents?view=detail&id='+original[0].id)).status,403);pass('four non-staff incident-history roles denied');
  for(const role of ['manager','finance']){const global=original.find(i=>i.branch_id===null);assert.equal((await call(role,'incidents?view=detail&id='+global.id)).status,404);}pass('branch staff cannot read business-wide incident history');
  for(const i of original){const detail=await ok('owner','incidents?view=detail&id='+i.id);assert.equal(detail.incident.id,i.id);assert.equal(detail.incident.target,i.target);assert.equal(detail.incident.detail,i.detail);if(stage==='final'){const finding=reviewed.findings.find(f=>f.id===i.id);assert.equal(detail.incident.status,finding.plannedDisposition);assert.ok(detail.events.some(e=>e.note.startsWith('PBR21 / synthetic client demo only / '+finding.confidence)));}}pass('all nine scoped detail histories load');
  assert.equal((await call('owner','incidents?view=detail&id='+original[0].id+'&page=0')).status,400);pass('invalid history pagination rejected');
  if(stage==='final'){assert.equal(original.filter(i=>incidents.find(r=>r.id===i.id).status==='resolved').length,6);assert.equal(original.filter(i=>incidents.find(r=>r.id===i.id).status==='acknowledged').length,3);pass('reviewed six resolved and three acknowledged dispositions retain exact evidence');const other=JSON.parse(await fs.readFile(dir+'other-retained-incidents.json','utf8')).outsideNineHighCriticalScope;for(const row of other){const now=incidents.find(i=>i.id===row.id);assert.equal(now.status,row.status);assert.equal(now.detail,row.detail);}assert.equal(incidents.length,12);pass('all12 records and separate medium delivery incident retained');}
 }
 result.status='PASS';
}catch(error){result.status='FAIL';result.failure=error.message;process.exitCode=1;}finally{
 result.sessionsRevoked=[];for(const role of Object.keys(tokens)){try{const r=await call(role,'logout',{});result.sessionsRevoked.push({role,status:r.status});if(r.status!==200)process.exitCode=1;}catch{result.sessionsRevoked.push({role,status:'FAILED'});process.exitCode=1;}}
 if(!result.sessionsRevoked.every(r=>r.status===200)){result.status='FAIL';result.failure='Session cleanup not confirmed'}result.finishedAt=new Date().toISOString();await fs.writeFile(dir+stage+'-hosted.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({stage,status:result.status,checks:checks.length,sessions:result.sessionsRevoked.length}));if(result.failure)console.error(result.failure);
}
