import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req=createRequire(path.resolve('tests/native-renderer/package.json')),React=req('react'),{create,act}=req('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'easygas-dv-ui-'));after(()=>fs.rm(temp,{recursive:true,force:true}));
await fs.writeFile(path.join(temp,'ui.tsx'),`import React from 'react';export const api=(...a)=>globalThis.dvApi(...a);export const Notice=({message})=><p role="alert">{message}</p>;export const Modal=({children,title})=><section role="dialog" aria-label={title}>{children}</section>;export const Loading=()=>null;export const money=String;`);
await build({stdin:{contents:`export {default as Assignment} from './apps/web/components/dispatch-vehicle';`,resolveDir:process.cwd(),loader:'tsx'},outfile:path.join(temp,'test.cjs'),bundle:true,format:'cjs',platform:'node',jsx:'automatic',plugins:[{name:'transport',setup(b){b.onResolve({filter:/^react(\/.*)?$/},a=>({path:req.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/ui$/},()=>({path:path.join(temp,'ui.tsx')}));}}]});
const {Assignment}=createRequire(import.meta.url)(path.join(temp,'test.cjs'));
const options={branches:[{id:'lagos',name:'Synthetic Lagos',active:true}],drivers:[{id:'D',name:'Synthetic off duty',branch_id:'lagos',driver_available:false,trip_id:null},{id:'busy',name:'Synthetic on trip',branch_id:'lagos',driver_available:true,trip_id:'T',vehicle_label:'Busy van'}],vehicles:[{id:'V',label:'Available van',branch_id:'lagos',capacity_grams:30000,trip_id:null},{id:'busy-v',label:'Busy van',branch_id:'lagos',capacity_grams:30000,trip_id:'T'}],writesEnabled:true,canSetAvailability:true};
const text=(t:any)=>JSON.stringify(t.toJSON());
async function submit(t:any,values:any){const original=globalThis.FormData;(globalThis as any).FormData=class{get(n:string){return values[n]??null;}};try{await act(async()=>t.root.findByType('form').props.onSubmit({preventDefault(){},currentTarget:{}}));}finally{globalThis.FormData=original;}}

test('DV-UI: real dialog exposes driver/vehicle/odometer/password and excludes occupied choices; role/release/empty states cannot submit',async()=>{
 let t:any; (globalThis as any).dvApi=async()=>options;
 try{
  await act(async()=>{t=create(React.createElement(Assignment,{branch:'lagos',onClose(){},onDone(){}}));});
  assert.equal(t.root.findAllByProps({name:'verificationPassword'}).length>0,true);
  const vehicle=t.root.findByProps({name:'vehicleId'});assert.deepEqual(vehicle.findAllByType('option').map((o:any)=>o.props.value),['','V']);
  assert.deepEqual(t.root.findByProps({name:'driverId'}).findAllByType('option').map((o:any)=>o.props.value),['','D']);
  assert.match(text(t),/Location sharing stays off|Drivers already on a trip/);
  assert.equal(t.root.findAllByType('button').find((b:any)=>b.children.join('')==='Drivers already on a trip').props['aria-expanded'],false);
  await act(async()=>t.unmount());
  (globalThis as any).dvApi=async()=>({...options,canSetAvailability:false,writesEnabled:false});
  await act(async()=>{t=create(React.createElement(Assignment,{branch:'lagos',onClose(){},onDone(){}}));});
  assert.equal(t.root.findAllByType('form').length,0);assert.match(text(t),/release controls/);
  await act(async()=>t.unmount());
  (globalThis as any).dvApi=async()=>({...options,drivers:[],vehicles:[]});
  await act(async()=>{t=create(React.createElement(Assignment,{branch:'lagos',onClose(){},onDone(){}}));});
  assert.equal(t.root.findAllByType('form').length,0);assert.match(text(t),/No active driver|No available LPG-suitable/);
 }finally{if(t)await act(async()=>t.unmount());delete(globalThis as any).dvApi;}
});

test('DV-FORM: wrong password makes no mutation; failed response retains exact operation key and fields; duplicate submits commit once without password or GPS consent in payload',async()=>{
 let t:any,done=0,first=true,resolve:any;const calls:any[]=[];
 (globalThis as any).dvApi=async(action:string,data:any)=>{calls.push({action,data});if(action==='dispatch.vehicle.options')return options;if(action==='reauth'){if(data.password==='wrong')throw Error('Incorrect password');return{};}if(first){first=false;throw Error('Response unavailable. Retry the same request.');}return new Promise(r=>resolve=r);};
 const values={driverId:'D',vehicleId:'V',startOdometer:'123.5',makeAvailable:'on',verificationPassword:'fixture-only'};
 try{
  await act(async()=>{t=create(React.createElement(Assignment,{branch:'lagos',onClose(){},onDone(){done++;}}));});
  const field=t.root.findByProps({name:'driverId'});
  await submit(t,{...values,verificationPassword:'wrong'});assert.equal(calls.filter(c=>c.action==='dispatch.vehicle.assign').length,0);
  await submit(t,values);assert.equal(t.root.findByProps({name:'driverId'}),field);assert.match(text(t),/Response unavailable/);
  const original=globalThis.FormData;(globalThis as any).FormData=class{get(n:string){return(values as any)[n]??null;}};
  try{let promise:any;await act(async()=>{const form=t.root.findByType('form');promise=form.props.onSubmit({preventDefault(){},currentTarget:{}});await form.props.onSubmit({preventDefault(){},currentTarget:{}});});assert.equal(calls.filter(c=>c.action==='dispatch.vehicle.assign').length,2);await act(async()=>{resolve({id:'trip',message:'Assigned'});await promise;});}finally{globalThis.FormData=original;}
  const writes=calls.filter(c=>c.action==='dispatch.vehicle.assign');assert.equal(writes[0].data.operationKey,writes[1].data.operationKey);assert.deepEqual(writes[1].data,{driverId:'D',vehicleId:'V',startOdometer:123.5,makeAvailable:true,operationKey:writes[0].data.operationKey});assert.equal(done,1);
 }finally{if(t)await act(async()=>t.unmount());delete(globalThis as any).dvApi;}
});

test('DV-READ-RECOVERY: failed options offer retry; unmounted late reads cannot restore a form',async()=>{
 let t:any;const pending:any[]=[];(globalThis as any).dvApi=(...args:any[])=>new Promise((resolve,reject)=>pending.push({args,resolve,reject}));
 try{await act(async()=>{t=create(React.createElement(Assignment,{branch:'lagos',onClose(){},onDone(){}}));});await act(async()=>pending[0].reject(Error('Unavailable')));assert.match(text(t),/Retry vehicle options/);assert.equal(t.root.findAllByType('form').length,0);
  await act(async()=>t.root.findAllByType('button').find((b:any)=>b.children.join('')==='Retry vehicle options').props.onClick());assert.equal(pending.length,2);await act(async()=>t.unmount());assert.equal(pending[1].args[2].signal.aborted,true);await act(async()=>pending[1].resolve(options));
 }finally{delete(globalThis as any).dvApi;}
});
