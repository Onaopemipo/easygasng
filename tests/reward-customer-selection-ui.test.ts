import test,{after} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {build} from 'esbuild';
const req=createRequire(path.resolve('tests/native-renderer/package.json')),React=req('react'),{create,act}=req('react-test-renderer');(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-reward-picker-'));after(()=>fs.rm(temp,{recursive:true,force:true}));
await fs.writeFile(path.join(temp,'ui.tsx'),`import React from 'react';export const api=(...a)=>globalThis.rewardPickerApi(...a);export const Notice=({message})=><p>{message}</p>;export const useModalClose=()=>()=>{};export const money=n=>'NGN '+n/100;`);
await build({entryPoints:['apps/web/components/setting-change-form.tsx','apps/web/components/rewards-customer-fields.tsx'],outdir:temp,bundle:true,format:'cjs',platform:'node',jsx:'automatic',plugins:[{name:'host',setup(b){b.onResolve({filter:/^react(\/.*)?$/},a=>({path:req.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/ui$/},()=>({path:path.join(temp,'ui.tsx')}));}}]});
const SettingForm=req(path.join(temp,'setting-change-form.js')).default,{RewardsCustomerFields}=req(path.join(temp,'rewards-customer-fields.js'));
const customer={id:'0176355b-11a2-44a8-b90a-a63f60e1bdb8',name:'Synthetic GY',public_customer_id:'EGC-'+ 'A'.repeat(32),branch_id:null,branch_name:null};
const initial={key:'loyalty.adjustment',scope:'lagos',version:3,value_type:'rewards_adjustment',value:{customerId:'old-account',points:999},risk:4,required_roles:['owner','finance']};
const text=(node:any)=>JSON.stringify(node.toJSON());
function dom(){return {querySelectorAll:()=>[],querySelector:()=>null,scrollIntoView(){},focus(){}};}
test('RSEL-FORM: real form searches public ID, selects a branchless customer, changes branch, reviews readable identity and submits correct scoped version without raw ID entry',async()=>{
 const calls:any[]=[];let result:any,t:any;
 const oldWindow=(globalThis as any).window,oldFrame=(globalThis as any).requestAnimationFrame;
 (globalThis as any).window={addEventListener(){},removeEventListener(){}};(globalThis as any).requestAnimationFrame=(f:any)=>f();
 (globalThis as any).rewardPickerApi=async(action:string,input:any)=>{calls.push({action,input});if(action==='branches')return [{id:'lagos',name:'Lagos'},{id:'qa-other',name:'Other demo branch'}];if(action.startsWith('rewards.customers'))return {customers:[customer],hasMore:false};if(action==='settings?scope=qa-other')return [{...initial,scope:'qa-other',version:7}];if(action==='setting.propose')return {id:'synthetic-request',status:'pending_approval'};throw Error(action);};
 try{
 await act(async()=>{t=create(React.createElement(SettingForm,{setting:initial,onDone:(r:any)=>result=r}),{createNodeMock:dom});});
 assert.doesNotMatch(text(t),/old-account/);assert.equal(t.root.findAllByType('input').find((n:any)=>n.props.type==='number').props.value,'');
 // Review is rejected until an explicit selection is resolved.
 await act(async()=>t.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.match(text(t),/Find and select a customer/);
 await act(async()=>t.root.findAllByType('input').find((n:any)=>n.props.placeholder?.includes('EGC')).props.onChange({target:{value:customer.public_customer_id}}));
 await act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.join('')==='Find customer').props.onClick());
 assert.match(text(t),/No branch assigned/);
 await act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.includes(customer.public_customer_id)).props.onClick());
 assert.match(text(t),/Selected customer/);assert.match(text(t),/Nothing changes until approval/);
 await act(async()=>t.root.findAllByType('select')[0].props.onChange({target:{value:'qa-other'}}));
 await act(async()=>t.root.findAllByType('input').find((n:any)=>n.props.type==='number').props.onChange({target:{value:'100'}}));
 await act(async()=>{for(const area of t.root.findAllByType('textarea'))area.props.onChange({target:{value:'Synthetic evidence and adjustment reason'}});});
 await act(async()=>t.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.match(text(t),/Review change/);assert.match(text(t),/Synthetic GY/);assert.match(text(t),/Other demo branch/);assert.doesNotMatch(text(t),new RegExp(customer.id));
 await act(async()=>t.root.findByType('form').props.onSubmit({preventDefault(){}}));
 const sent=calls.find(c=>c.action==='setting.propose').input;assert.equal(sent.scope,'qa-other');assert.equal(sent.version,7);assert.equal(sent.value.customerId,customer.id);assert.equal(sent.value.customerPublicId,customer.public_customer_id);assert.equal(sent.value.assignBranchId,'qa-other');assert.equal(sent.value.points,100);assert.equal(result.status,'pending_approval');
 }finally{if(t)await act(async()=>t.unmount());(globalThis as any).window=oldWindow;(globalThis as any).requestAnimationFrame=oldFrame;}
});
test('RSEL-PICKER: empty/failure retry, distinct same-name results, existing branch selection, and failed branch switch keep the last valid selection',async()=>{
 let t:any,value:any={},mode='empty';const scopes:string[]=[];const existing={...customer,id:'a',public_customer_id:'EGC-'+ 'B'.repeat(32),branch_id:'qa-other',branch_name:'Other branch'};
 (globalThis as any).rewardPickerApi=async()=>{if(mode==='fail')throw Error('Temporary lookup failure');return {customers:mode==='empty'?[]:[customer,existing],hasMore:false};};
 const props=()=>({value,scope:'lagos',branches:[{id:'lagos',name:'Lagos'},{id:'qa-other',name:'Other branch'}],lockedScope:false,onSelected(){},onChange:(v:any)=>value=v,onScopeChange:async(s:string)=>{scopes.push(s);if(mode==='switchfail')throw Error('Branch could not load');}});
 try{await act(async()=>{t=create(React.createElement(RewardsCustomerFields,props()));});const setquery=async()=>act(async()=>t.root.findByType('input').props.onChange({target:{value:'Synthetic'}}));const search=async()=>act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.join('')==='Find customer').props.onClick());
 await setquery();await search();assert.match(text(t),/No active customers found/);mode='fail';await search();assert.match(text(t),/Temporary lookup failure/);mode='results';await search();assert.equal(t.root.findAllByType('li').length,2);
 mode='switchfail';await act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.includes(existing.public_customer_id)).props.onClick());assert.equal(value.customerId,undefined);assert.match(text(t),/Branch could not load/);
 mode='results';await act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.includes(existing.public_customer_id)).props.onClick());assert.equal(value.customerId,'a');assert.equal(value.assignBranchId,undefined);assert.equal(scopes.at(-1),'qa-other');assert.equal(t.root.findByType('select').props.disabled,true);
 }finally{if(t)await act(async()=>t.unmount());}
});
