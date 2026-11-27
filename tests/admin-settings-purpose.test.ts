import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {settingsCategories,settingsGroups,settingsDisplay,settingsDisplayCategory,settingMatches,settingsApprovalBadge} from '../packages/business-rules/src/settings-categories';
import {adminSettingsCategoryOrder} from '../packages/business-rules/src/admin-settings-purpose';
import {createDatabase,migrate,one} from '../apps/web/lib/db';import {dispatch} from '../apps/web/lib/service';import {hashPassword,id,issueSession} from '../apps/web/lib/auth';
const defs=JSON.parse(await readFile('docs/admin-settings-audit/evidence/definition-audit.json','utf8')).definitions;
test('ASSET-COVERAGE: every live setting appears exactly once across nine categories; all remaining 71 and payment six retained',()=>{
 assert.equal(defs.length,77);const before=structuredClone(defs);assert.deepEqual(settingsCategories(defs),adminSettingsCategoryOrder);
 const counts=Object.fromEntries(settingsCategories(defs).map(category=>[category,settingsGroups(defs,category,'').flatMap(g=>g.settings).length]));
 assert.deepEqual(counts,{'Business & Website':4,'Policies & Terms':9,'Gas & Products':26,'Delivery & Dispatch':12,'Services & Safety':10,'Payments & Wallet':6,'Rewards & Retention':7,'Stock & Valuation':1,'Staff & Security':2});
 const all=settingsCategories(defs).flatMap(c=>settingsGroups(defs,c,'').flatMap(g=>g.settings));assert.equal(all.length,77);assert.equal(new Set(all.map(d=>d.key)).size,77);assert.deepEqual(all.map(d=>d.key).sort(),defs.map((d:any)=>d.key).sort());assert.deepEqual(defs,before);
 for(const d of defs){const {label,description,...original}=d;const {label:newLabel,description:newDescription,...after}=settingsDisplay(d);assert.deepEqual(after,original,d.key);for(const q of [d.key,d.label,d.category,newLabel,settingsDisplayCategory(d)])assert.ok(settingMatches(d,q),d.key+' / '+q);}
 const search=settingsGroups(defs,'unused','');assert.equal(search.length,0);assert.equal(settingsGroups(defs,'unused','policy').flatMap(g=>g.settings).length,new Set(settingsGroups(defs,'unused','policy').flatMap(g=>g.settings).map(d=>d.key)).size);
 for(const future of [{key:'future.delivery',category:'Delivery',label:'Future coverage control',description:'Keep me'},{key:'future.unrelated',category:'Future category',label:'Unknown',description:'Keep me'},{key:'location.new-id',category:'Delivery Locations',label:'New named area',description:'Coverage'}])assert.equal(settingsGroups([future],settingsDisplayCategory(future),'')[0].settings[0],future);
});
test('ASSET-LABELS: current policies, legacy fields and independent operational purposes stay distinct and searchable',()=>{
 const by=(key:string)=>defs.find((d:any)=>d.key===key);const display=(key:string)=>settingsDisplay(by(key));
 assert.match(display('delivery.fee').label,/customer delivery/i);assert.match(display('dispatch.routing').description,/do not change customer delivery fees/i);
 assert.match(display('loyalty.policy').description,/technical enablement flags/);assert.match(display('loyalty.credit_per_point').description,/does not enable a points-to-wallet transfer/);
 for(const key of ['loyalty.enabled','loyalty.spend_per_point','loyalty.credit_per_point','delivery.zones','price.refill-6','price.refill-12','price.refill-25','price.refill-50']){const d=by(key);const g=settingsGroups([d],settingsDisplayCategory(d),'')[0];assert.equal(g.advanced,true,key);assert.match(display(key).label,/legacy/i);assert.equal(settingsGroups([d],'unused',d.label)[0].settings[0],d);}
 assert.equal(settingsGroups([by('publish.refill-6')],'Gas & Products','')[0].advanced,false);
 assert.match(display('document.identity').description,/Existing issued documents/);assert.match(display('website.content').description,/public contacts/);assert.match(display('security.policy').label,/read-only/);
 assert.equal(settingsApprovalBadge({...by('loyalty.policy'),owner_auto_approval:true},'owner').label,'One Admin approval');
 assert.equal(settingsApprovalBadge({...by('payment.gateway'),owner_auto_approval:false},'owner').label,'Admin approval required');
 assert.equal(settingsApprovalBadge({...by('security.policy'),propose_roles:[]},'owner').label,'Read only');
 assert.equal(settingsApprovalBadge({...by('document.identity'),propose_roles:['owner'],owner_auto_approval:false},'finance').label,'View only');
 assert.equal(settingsDisplayCategory(by('legal.privacy')),'Policies & Terms');assert.equal(settingsDisplayCategory(by('security.policy')),'Staff & Security');
 const colliding=[{key:'x',category:'New A',label:'Same',description:'x'},{key:'y',category:'New B',label:'Same',description:'y'}];assert.equal(settingsGroups(colliding,'unused','Same').length,2);
});
test('ASSET-SECURITY: six-role real service data retain canonical definitions; renamed delivery/catalogue/rewards/safety/access requests remain scoped, draft-only and server-validated',async()=>{
 const db=await createDatabase('memory://');await migrate(db);try{
 const actors:Record<string,any>={};const password='Synthetic-settings-purpose-only-123!';for(const role of ['owner','manager','finance','driver','technician','customer']){const uid=id();await db.query('INSERT INTO users(id,name,email,password_hash,role,branch_id,active) VALUES($1,$2,$3,$4,$5,$6,true)',[uid,'Synthetic '+role,role+'@purpose.example.test',hashPassword(password),role,'lagos']);actors[role]={id:uid,token:await issueSession(db,uid)};}
 const call=(role:string,a:string,v:any)=>dispatch(a,actors[role].token,v,db);
 for(const role of ['owner','manager','finance']){const rows=await call(role,'settings',{scope:'lagos'});const before=structuredClone(rows);const grouped=settingsCategories(rows).flatMap(c=>settingsGroups(rows,c,'').flatMap(g=>g.settings));assert.equal(grouped.length,rows.length);assert.equal(new Set(grouped.map(d=>d.key)).size,rows.length);assert.deepEqual(rows,before);for(const d of grouped){assert.ok(d.view_roles.includes(role));const display=settingsDisplay(d);for(const field of ['key','category','scope','version','value','risk','view_roles','propose_roles','approve_roles','required_roles','owner_auto_approval','additional_verification'])assert.deepEqual(display[field],d[field]);}}
 for(const role of ['driver','technician','customer'])await assert.rejects(()=>call(role,'settings',{scope:'lagos'}));
 const rows=await call('owner','settings',{scope:'lagos'});const submission=(key:string,extra:any={})=>{const d=settingsDisplay(rows.find((d:any)=>d.key===key));return {key:d.key,scope:d.scope,version:d.version,value:d.value,reason:'Synthetic purpose handoff only',draft:true,...extra};};
 for(const key of ['delivery.fee','delivery.windows','gas.quantity_policy','price.cylinder-empty-6','publish.cylinder-empty-6','loyalty.policy','business.hours']){const request=await call('owner','setting.propose',submission(key));assert.equal(request.status,'draft',key);assert.equal((await one(db,'SELECT version FROM settings WHERE key=$1 AND scope=$2',[key,'lagos']))!.version,rows.find((d:any)=>d.key===key).version);}
 await assert.rejects(()=>call('owner','setting.propose',submission('delivery.fee',{version:999})),{code:'VERSION_CONFLICT'});
 await assert.rejects(()=>call('manager','settings',{scope:'other-branch'}));
 await assert.rejects(()=>call('owner','setting.propose',{...submission('delivery.fee'),category:'Routine',risk:1}));
 await assert.rejects(()=>call('manager','setting.propose',submission('loyalty.policy')));await assert.rejects(()=>call('finance','setting.propose',submission('security.permissions')));await assert.rejects(()=>call('owner','setting.propose',submission('security.policy')));
 await assert.rejects(()=>call('owner','setting.propose',submission('delivery.windows',{value:'bad window'})));
 await assert.rejects(()=>call('owner','setting.propose',submission('security.permissions',{value:{userId:actors.owner.id,role:'owner',branchId:'lagos'}})),/own privileges/);
 }finally{await db.close();}
});
