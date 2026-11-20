import fs from'node:fs/promises';import path from'node:path';import assert from'node:assert/strict';import test from'node:test';import{createHash}from'node:crypto';import{features,workspaces}from'../prototypes/easygas-experience/features.mjs';
const base='prototypes/easygas-experience',read=async p=>JSON.parse(await fs.readFile(p,'utf8')),routes=await read('docs/user-manual/evidence/route-inventory.json'),manifest=await read(base+'/source-manifest.json'),fixture=await read(base+'/fixtures.json'),checks=[];
const check=async(id,fn,detail={})=>await test(id+': source and artifact validation',async()=>{await fn();checks.push({id,result:'PASS',...detail})});
// The original prototype remains historical; bind each explicitly reviewed web continuation
// to its original manifest hash rather than rewriting or silently dropping the baseline.
const settingsContinuation=await read('docs/settings-modal/reviewed-source-changes.json');
await check('EXP-SOURCE-FIDELITY',async()=>{for(const source of manifest.sources){
 if(settingsContinuation.files[source.path])assert.equal(settingsContinuation.baseline[source.path],source.sha256,source.path+' original prototype baseline');
 assert.equal(createHash('sha256').update(await fs.readFile(source.path)).digest('hex'),settingsContinuation.files[source.path]??source.sha256,source.path);
}},{sources:manifest.sources.length,originalManifestRetained:true,reviewedContinuation:'docs/settings-modal/reviewed-source-changes.json'});
await check('EXP-STATIC-ROUTES',async()=>{const html=await fs.readFile(base+'/dist/index.html','utf8');for(const {route}of routes)assert.equal(await fs.readFile(path.join(base,'dist',route,'index.html'),'utf8'),html,route)},{count:routes.length});
await check('EXP-FEATURE-COVERAGE',async()=>{assert.equal(features.length,36);assert.equal(features.reduce((n,f)=>n+f.items.length,0),300);const coverage=await read('docs/prototype/feature-coverage.json');for(const f of coverage){assert.ok(f.implementationFiles.some(p=>p.startsWith('apps/web/components/')),f.name);for(const file of f.implementationFiles)await fs.access(file);if(f.route.startsWith('/admin'))assert.ok(fixture[f.role].navigation.data.allowed.includes(f.route.split('/')[2]||'dashboard'),f.name)}},{families:features.length,namedFeatures:300});
await check('EXP-PERSONAS',()=>{for(const r of workspaces)assert.ok(r.role==='public'||fixture[r.role].me.data.user.role===r.role);assert.equal(new Set(workspaces.map(x=>x.role)).size,7)},{signedIn:6,public:1});
await check('EXP-MODEL-EVIDENCE',async()=>{const models=await read('docs/prototype/evidence/model-tests.json');assert.equal(models.checks.filter(x=>x.result==='PASS').length,9)},{tests:9});
await check('EXP-CREDENTIAL-FREE',async()=>{const text=await fs.readFile(base+'/fixtures.json','utf8');assert.ok(!/"(?:password|token|request_hash|idempotency_key|secret)"\s*:/i.test(text));assert.ok(!/eyJ[a-zA-Z0-9_-]{30,}\./.test(text))});
await fs.writeFile('docs/prototype/evidence/artifact-checks.json',JSON.stringify({at:new Date().toISOString(),checks,limits:['Does not assert all business mutations','Hosted authenticated and phone interaction verification pending']},null,2)+'\n');
