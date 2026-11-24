import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fixture } from './helpers/order-tracking-fixture';
import { actor, id, issueSession } from '../apps/web/lib/auth';
import { adminDashboard } from '../apps/web/lib/admin-dashboard';
import { navigationSnapshot } from '../apps/web/lib/navigation';
import { type SQL } from '../apps/web/lib/db';
const base='2b289be';
const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const temp=await mkdtemp(join(tmpdir(),'easygas-admin-loading-'));
after(()=>rm(temp,{recursive:true,force:true}));
function published(name:string){
 const source=execFileSync('git',['show',base+':apps/web/lib/'+name+'.ts'],{encoding:'utf8'});
 return source.replace(/from (["'])(\.{1,2}\/[^"']+)\1/g,(_,quote,p)=>'from '+JSON.stringify(p==='./navigation'?join(temp,'navigation.ts'):resolve('apps/web/lib',p)+'.ts')).replace(/from ["']zod["']/g,'from '+JSON.stringify(resolve('node_modules/zod/index.js')));
}
await writeFile(join(temp,'navigation.ts'),published('navigation'));
await writeFile(join(temp,'dashboard.ts'),published('admin-dashboard'));
const priorNav=await import(pathToFileURL(join(temp,'navigation.ts')).href);
const priorDashboard=await import(pathToFileURL(join(temp,'dashboard.ts')).href);
function meter(tx:SQL){
 const stats={roundTrips:0};
 return {stats,sql:{query:async(q:string,p?:any[])=>{stats.roundTrips++;return tx.query(q,p);},exec:async(q:string)=>{stats.roundTrips++;return tx.exec(q);}} as SQL};
}
const normal=(r:any)=>{const {generatedAt,...v}=r;return JSON.parse(JSON.stringify(v));};
const outcome=async(fn:()=>Promise<any>)=>{try{return{value:normal(await fn())};}catch(e:any){return{error:e.status,message:e.message};}};
test('AL-CONTRACT: complete committed navigation/dashboard contracts match every role, empty/populated scopes and pages; normal SQL round trips stay bounded',async()=>{
 const f=await fixture();const rows:any[]=[];
 try{
  for(let i=0;i<7;i++)await f.make();
  const technician=id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic technician',$2,password_hash,'technician','lagos' FROM users WHERE id=$3",[technician,technician+'@al.example.test',f.actors.driver.id]);f.actors.technician={id:technician,token:await issueSession(f.db,technician)};
  for(const role of Object.keys(f.actors)){
   const user=await f.db.transaction(tx=>actor(tx,f.actors[role].token));
   for(const input of [{from:today,to:today,page:1},{from:'2000-01-01',to:'2000-01-02',page:1},{from:today,to:today,branchId:'lagos',page:2}]){
    const old=await f.db.transaction(async tx=>{const m=meter(tx);return{result:await outcome(()=>priorDashboard.adminDashboard(m.sql,user,input)),trips:m.stats.roundTrips};});
    const fresh=await f.db.transaction(async tx=>{const m=meter(tx);return{result:await outcome(()=>adminDashboard(m.sql,user,input)),trips:m.stats.roundTrips};});
    assert.deepEqual(fresh.result,old.result,role+' full dashboard '+JSON.stringify(input));
    if('value' in fresh.result){assert.ok(fresh.trips<=(input.branchId ? 9 : 8),role+' dashboard should use normal batch path: '+fresh.trips);if(role==='owner')rows.push({role,kind:'dashboard',input,before:old.trips,after:fresh.trips});}
   }
   const old=await f.db.transaction(async tx=>{const m=meter(tx);return{result:await outcome(()=>priorNav.navigationSnapshot(m.sql,user,{})),trips:m.stats.roundTrips};});
   const fresh=await f.db.transaction(async tx=>{const m=meter(tx);return{result:await outcome(()=>navigationSnapshot(m.sql,user,{})),trips:m.stats.roundTrips};});
   assert.deepEqual(fresh.result,old.result,role+' full navigation');
   if('value' in fresh.result){assert.ok(fresh.trips<=4);rows.push({role,kind:'navigation',before:old.trips,after:fresh.trips});}
  }
  const report={baselineCommit:base,scope:'Actual full committed contracts and SQL round trips on disposable PGlite; not a hosted latency benchmark',rows};
  await writeFile('docs/admin-loading-20261124/evidence/query-comparison.json',JSON.stringify(report,null,2)+'\n');
 }finally{await f.db.close?.();}
});

test('AL-FALLBACK: a real SQL failure in the combined read rolls back to its savepoint and retains the original independent widget result',async()=>{
 const f=await fixture();
 try{
  await f.make();
  const user=await f.db.transaction(tx=>actor(tx,f.actors.owner.token));
  const input={from:today,to:today,page:1};
  const before=await f.db.transaction(tx=>priorDashboard.adminDashboard(tx,user,input));
  let failures=0;
  const after=await f.db.transaction(tx=>adminDashboard({exec:q=>tx.exec(q),query:(q,p)=>{if(q.includes('AS statuses')){failures++;return tx.query('SELECT * FROM synthetic_missing_admin_table');}return tx.query(q,p);}},user,input));
  assert.equal(failures,1);assert.deepEqual(normal(after),normal(before));assert.deepEqual(after.errors,{});
 }finally{await f.db.close?.();}
});
