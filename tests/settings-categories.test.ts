import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {readFile} from 'node:fs/promises';
import {settingsCategories,settingsDisplay,settingsDisplayCategory,settingsGroups,settingMatches} from '../packages/business-rules/src/settings-categories';
import Group from '../apps/web/components/settings-purpose-group';
import {createDatabase,migrate,one} from '../apps/web/lib/db';import {dispatch} from '../apps/web/lib/service';import {hashPassword,id,issueSession} from '../apps/web/lib/auth';
const audit=JSON.parse(await readFile('docs/settings-categories/evidence/definition-audit.json','utf8')).definitions;
test('SCAT-MAPPING: six existing controls consolidate once into four accurate sections without changing their DTOs',()=>{
 const original=structuredClone(audit);assert.deepEqual(settingsCategories(audit),['Payments & Wallet']);
 const groups=settingsGroups(audit,'Payments & Wallet','');assert.deepEqual(groups.map(g=>g.title),['Online payments','Customer wallet','Cash & settlement','Advanced controls']);assert.equal(groups.at(-1)!.advanced,true);
 assert.deepEqual(groups.flatMap(g=>g.settings).map(d=>d.key).sort(),audit.map((d:any)=>d.key).sort());assert.deepEqual(audit,original);
 for(const d of audit){const display=settingsDisplay({...d,value:{example:150},version:3,scope:'lagos'});assert.equal(display.key,d.key);assert.equal(display.category,d.category);assert.equal(display.version,3);assert.equal(display.value.example,150);assert.deepEqual(display.propose_roles,d.propose_roles);assert.deepEqual(display.approve_roles,d.approve_roles);}
 assert.equal(settingsDisplay(audit.find((d:any)=>d.key==='wallet.maximum')).label,'Cash & bank-transfer wallet limit');assert.match(settingsDisplay(audit.find((d:any)=>d.key==='wallet.maximum')).description,/Card top-up limits are separate/);
 const other={key:'other',category:'Delivery',label:'Other',description:'Kept'};assert.equal(settingsDisplay(other),other);assert.equal(settingsDisplayCategory(other),'Delivery');assert.equal(settingsGroups([...audit,other],'Delivery','')[0].settings[0],other);
 const future={key:'payment.future',category:'Wallet',label:'Future control',description:'Kept'};assert.equal(settingsGroups([future],'Payments & Wallet','')[0].title,'Other payment controls');
});
test('SCAT-SEARCH: previous names, purpose names and keys stay discoverable; matching advanced controls expand',()=>{
 for(const d of audit){for(const q of [d.label,d.key,settingsDisplay(d).label])assert.ok(settingMatches(d,q),q);}
 for(const q of ['Payments & Wallet','Wallet & Payments','Wallet'])assert.equal(settingsGroups(audit,'unused',q).flatMap(g=>g.settings).length,6);
 const advanced=settingsGroups(audit,'unused','legacy')[0];assert.equal(advanced.title,'Advanced controls');
 for(const searching of [true,false]){const html=renderToStaticMarkup(React.createElement(Group,{title:advanced.title,advanced:true,searching,children:'Legacy control'}));assert.equal(html.includes('open=""'),searching);}
 assert.equal(settingsGroups(audit,'Payments & Wallet','not a setting').length,0);
});
test('SCAT-SECURITY: role-filtered live service DTOs retain categories/authority; renamed handoffs keep canonical key/version and server rejections',async()=>{
 const db=await createDatabase('memory://');await migrate(db);try{
 const users:Record<string,string>={};for(const role of ['owner','manager','finance','driver','technician','customer']){const uid=id();await db.query('INSERT INTO users(id,name,email,password_hash,role,branch_id,active) VALUES($1,$2,$3,$4,$5,$6,true)',[uid,'Synthetic '+role,role+'@categories.example.test',hashPassword('Synthetic-categories-only-123!'),role,'lagos']);users[role]=await issueSession(db,uid);}
 const call=(role:string,a:string,v:any)=>dispatch(a,users[role],v,db);
 for(const role of ['owner','finance','manager']){
 const data=await call(role,'settings',{scope:'lagos'});const before=structuredClone(data);const groups=settingsGroups(data,'Payments & Wallet','');
 assert.ok(settingsCategories(data).includes('Payments & Wallet'));assert.ok(!settingsCategories(data).includes('Wallet'));assert.ok(!settingsCategories(data).includes('Wallet & Payments'));
 const rows=groups.flatMap(g=>g.settings);assert.equal(new Set(rows.map(d=>d.key)).size,rows.length);for(const d of rows)assert.ok(d.view_roles.includes(role));assert.deepEqual(data,before);
 if(role==='manager')assert.deepEqual(rows.map(d=>d.key).sort(),['payment.cod','wallet.enabled']);else assert.equal(rows.length,6);
 }
 for(const role of ['driver','technician','customer'])await assert.rejects(()=>call(role,'settings',{scope:'lagos'}));
 const source=(await call('owner','settings',{scope:'lagos'})).find((d:any)=>d.key==='payment.gateway');const d=settingsDisplay(source);const input={key:d.key,scope:d.scope,version:d.version,value:d.value,reason:'Synthetic category handoff only',draft:true};const saved=await call('owner','setting.propose',input);assert.equal(saved.status,'draft');assert.equal((await one(db,"SELECT version FROM settings WHERE key='payment.gateway' AND scope='lagos'"))!.version,d.version);
 await assert.rejects(()=>call('manager','setting.propose',input));await assert.rejects(()=>call('owner','setting.propose',{...input,version:999}),{code:'VERSION_CONFLICT'});await assert.rejects(()=>call('owner','setting.propose',{...input,value:{...d.value,environment:'live'}}));
 }finally{await db.close();}
});
