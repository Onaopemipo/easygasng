// Read-only build prerequisite. Runtime credentials never apply migrations or gain DDL privileges.
import {createDatabase,one} from './apps/web/lib/db';
if(process.env.EASYGAS_CLIENT_DEMO!=='true'||process.env.APP_URL!=='https://easygas-client-demo.vercel.app'||!process.env.DATABASE_URL)throw Error('This prerequisite check is restricted to the existing client demo.');
const db=await createDatabase();
try{
 if(!await one(db,"SELECT version FROM schema_migrations WHERE version='082'"))throw Error('Apply reviewed migration082 using the database migration owner before deploying this release.');
 for(const table of ['order_visit_links','order_visit_products']){
  const info=await one(db,"SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid=to_regclass($1)",[table]);
  if(!info?.relrowsecurity||!info?.relforcerowsecurity)throw Error('Same-visit tables require forced row security.');
  if(!(await one(db,"SELECT has_table_privilege(current_user,$1,'SELECT') AND has_table_privilege(current_user,$1,'INSERT') AND ($2::boolean OR has_table_privilege(current_user,$1,'UPDATE')) AS allowed",[table,table==='order_visit_links']))?.allowed)throw Error('Runtime is missing scoped visit table access.');
 }
 console.log('Read-only same-visit schema082 and forced row security verified.');
}finally{await db.close?.();}
