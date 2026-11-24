import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const req=createRequire(resolve('tests/native-renderer/package.json'));
const React=req('react'),{create,act}=req('react-test-renderer');
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const temp=await mkdtemp(join(tmpdir(),'easygas-admin-loading-ui-'));
after(()=>rm(temp,{recursive:true,force:true}));
const browser=join(temp,'browser.tsx');
await writeFile(browser,`import React from 'react';export const createPortal=c=>c;export const usePathname=()=>'/admin';export default function Link({children,...p}){return <a {...p}>{children}</a>}`);
await build({stdin:{contents:"export {default} from './apps/web/components/admin-overview';",resolveDir:process.cwd(),loader:'tsx'},outfile:join(temp,'ui.cjs'),bundle:true,format:'cjs',platform:'node',jsx:'automatic',plugins:[{name:'browser',setup(b){b.onResolve({filter:/^react(\/.*)?$/},a=>({path:req.resolve(a.path),external:true}));b.onResolve({filter:/^(react-dom|next\/navigation|next\/link)$/},()=>({path:browser}));}}]});
const Dashboard=createRequire(import.meta.url)(join(temp,'ui.cjs')).default;
const text=(v:any):string=>v==null?'':typeof v==='string'?v:Array.isArray(v)?v.map(text).join(' '):text(v.children);
test('AL-DASHBOARD-RECOVERY: actual Dashboard settles a stalled response body, enables explicit retry, renders canonical content and clears it on revoked access',async()=>{
 const previous={window:(globalThis as any).window,document:(globalThis as any).document,fetch:globalThis.fetch,setTimeout:globalThis.setTimeout,setInterval:globalThis.setInterval,clearInterval:globalThis.clearInterval};
 let poll:()=>Promise<void>;
 const events:string[]=[];const noop=()=>{};let calls=0,signal:AbortSignal|undefined,stage='hung',renderer:any;
 (globalThis as any).window={location:{pathname:'/admin',assign:(p:string)=>events.push(p)},addEventListener:noop,removeEventListener:noop,dispatchEvent:noop};
 (globalThis as any).document={hidden:false,addEventListener:noop,removeEventListener:noop};
 (globalThis as any).setTimeout=((fn:any,ms:any,...args:any[])=>previous.setTimeout(fn,ms===20000?25:ms,...args)) as any;
 (globalThis as any).setInterval=((callback:any)=>{poll=callback;return 1;}) as any;
 (globalThis as any).clearInterval=(()=>{}) as any;
 globalThis.fetch=(async(_url:any,options:any)=>{
  calls++;signal=options.signal;
  if(stage==='hung')return{ok:true,status:200,json:()=>new Promise(()=>{})};
  if(stage==='forbidden')return{ok:false,status:403,json:async()=>({error:'Workspace access revoked.'})};
  const to=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  return{ok:true,status:200,json:async()=>({scope:{branchId:null,label:'All authorised branches',from:to.slice(0,8)+'01',to},allowed:['orders'],orders:{count:3,statuses:[{status:'placed',count:3}]},trend:[],recent:{rows:[],hasMore:false,page:1},operations:null,branches:[],errors:{},generatedAt:new Date().toISOString()})};
 }) as any;
 try{
  await act(async()=>{renderer=create(React.createElement(Dashboard,{user:{id:'owner-A',role:'owner',name:'Synthetic owner'}}));});
  await act(async()=>{await new Promise(r=>previous.setTimeout(r,70));});
  assert.match(text(renderer.toJSON()),/No dashboard snapshot available. Retry refresh/);
  assert.equal(signal?.aborted,true);assert.equal(calls,1,'no automatic retry');
  await act(async()=>poll());assert.equal(calls,1,'polling must stay stopped after failure until explicit Refresh');
  const refresh=()=>renderer.root.findAllByType('button').find((b:any)=>text(b.props.children).includes('Refresh'));
  assert.equal(refresh().props.disabled,false);
  stage='success';await act(async()=>refresh().props.onClick());
  assert.equal(calls,2);assert.match(text(renderer.toJSON()),/Order status/i);assert.doesNotMatch(text(renderer.toJSON()),/No dashboard snapshot available/);
  stage='forbidden';await act(async()=>refresh().props.onClick());
  assert.equal(calls,3);assert.match(text(renderer.toJSON()),/Workspace access revoked/);assert.match(text(renderer.toJSON()),/No dashboard snapshot available/);assert.doesNotMatch(text(renderer.toJSON()),/Order status/i);
 }finally{
  if(renderer)await act(async()=>renderer.unmount());
  Object.assign(globalThis,previous);
 }
});
