import{readFile,writeFile,chmod}from'node:fs/promises';
import{randomBytes}from'node:crypto';
import{parseEnv}from'node:util';
import{createDatabase,one}from'../apps/web/lib/db';
import{hashPassword,id}from'../apps/web/lib/auth';
const m=JSON.parse(await readFile('/tmp/easygas-vercel-demo-credentials.json','utf8'));
if(m.purpose!=='isolated-vercel-client-demo'||m.project!=='easygas-client-demo')throw Error('Dedicated demo required');
process.loadEnvFile('/tmp/easygas-deploy-current.env');
if(process.env.EASYGAS_CLIENT_DEMO!=='true')throw Error('Client demo flag required');
const protectedEnv=parseEnv(await readFile('/tmp/easygas-vercel-demo.env','utf8'));
const manifestUrl=new URL(m.runtimeUrl),configured=new URL(protectedEnv.DATABASE_URL_UNPOOLED??protectedEnv.DATABASE_URL!);
if(configured.hostname.replace('-pooler','')!==manifestUrl.hostname.replace('-pooler','')||configured.pathname!==manifestUrl.pathname||!configured.hostname.endsWith('.neon.tech'))throw Error('Demo target mismatch');
process.env.DATABASE_URL=m.runtimeUrl;process.env.NODE_ENV='production';process.env.EASYGAS_BACKGROUND_JOBS='false';
const db=await createDatabase();
const roles=['owner','manager','finance','inventory','dispatcher','sales','driver','technician','service_manager','safety_officer','administrator','customer','commercial'];
const accounts=roles.map(role=>({role,id:id(),email:`${role}.qa10nov@demo.easygas.invalid`,password:'Eg!'+randomBytes(12).toString('base64url')}));
const privateFile='.data/demo-test-logins-20261110.json';
try{
 const privilege=await one(db,'SELECT current_user name,rolsuper,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user');
 if(privilege?.name!=='easygas_demo_runtime'||privilege.rolsuper||privilege.rolcreaterole||privilege.rolbypassrls)throw Error('Restricted dedicated runtime required');
 const counts=async()=> (await db.query('SELECT (SELECT count(*) FROM users)::int users,(SELECT count(*) FROM orders)::int orders,(SELECT count(*) FROM wallet_entries)::int wallet_entries,(SELECT count(*) FROM verified_payments)::int verified_payments')).rows[0];
 const before=await counts();
 await writeFile(privateFile,JSON.stringify({purpose:m.purpose,project:m.project,accounts},null,2),{mode:0o600,flag:'wx'});await chmod(privateFile,0o600);
 await db.transaction(async tx=>{for(const a of accounts){
 await tx.query("INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,$5,'lagos',true)",[a.id,`Demo QA 10 Nov ${a.role.replaceAll('_',' ')}`,a.email,hashPassword(a.password),a.role]);
 await tx.query("INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,'vercel_demo.account_created',$2,'success',$3)",[id(),a.id,JSON.stringify({synthetic:true,purpose:'user-requested-fresh-test-logins',role:a.role})]);
 }});
 const after=await counts();if(after.users!==before.users+accounts.length||after.orders!==before.orders||after.wallet_entries!==before.wallet_entries||after.verified_payments!==before.verified_payments)throw Error('Unexpected record counts; investigate');
 const report={target:'isolated-vercel-client-demo',createdRoles:roles,before,after,existingAccountsPreserved:true,financialRecordsPreserved:true,credentialsInGit:false};
 await writeFile('docs/demo-accounts/evidence/provisioning.json',JSON.stringify(report,null,2));console.log('PASS thirteen fresh synthetic demo identities created; existing accounts and financial records preserved; credentials saved privately.');
}finally{await db.close?.();}
