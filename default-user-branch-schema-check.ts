// Existing-demo read-only deployment gate. No DDL or data changes.
import {createDatabase,one} from './apps/web/lib/db';
if(process.env.EASYGAS_CLIENT_DEMO!=='true'||process.env.APP_URL!=='https://easygas-client-demo.vercel.app'||!process.env.DATABASE_URL)throw Error('Restricted to existing EasyGas client demo.');
const db=await createDatabase();
try{
 if(!(await one(db,"SELECT version FROM schema_migrations WHERE version='084'")))throw Error('Apply reviewed migration084 before publishing Lagos defaults.');
 const state=await one(db,"SELECT (SELECT pg_get_expr(d.adbin,d.adrelid) FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid=d.adrelid AND a.attnum=d.adnum WHERE d.adrelid='users'::regclass AND a.attname='branch_id') AS branch_default,EXISTS(SELECT 1 FROM branches WHERE id='lagos' AND active=true) AS active_lagos,EXISTS(SELECT 1 FROM users WHERE branch_id IS NULL) AS missing,has_schema_privilege(current_user,current_schema(),'CREATE') AS ddl");
 if(state?.branch_default!=="'lagos'::text"||!state.active_lagos||state.missing||state.ddl)throw Error('Lagos schema/default/backfill and restricted-runtime checks failed.');
 console.log('Read-only Lagos schema084/default/backfill/restricted-runtime checks passed.');
}finally{await db.close?.();}
