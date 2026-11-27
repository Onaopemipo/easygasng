// Isolated, disposable local browser acceptance. Never connects to a hosted database.
import next from 'next';import {createServer} from 'node:http';import {mkdtemp,writeFile,unlink} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';
import {createDatabase,migrate} from '../apps/web/lib/db.ts';import {hashPassword,id} from '../apps/web/lib/auth.ts';
if(process.env.DATABASE_URL || process.env.NODE_ENV==='production')throw Error('Disposable local fixture only');
const dir=await mkdtemp(join(tmpdir(),'easygas-lagos-default-')),db=await createDatabase(join(dir,'db')),password='Synthetic-lagos-browser-only-123!';await migrate(db);
let customerId;
for(const role of ['owner','customer']){const uid=id();if(role==='customer')customerId=uid;await db.query('INSERT INTO users(id,name,email,password_hash,role,branch_id,active,verified) VALUES($1,$2,$3,$4,$5,$6,true,true)',[uid,'Synthetic Lagos '+role,role+'@lagos-qa.invalid',hashPassword(password),role,'lagos']);}
const publicId=(await db.query('SELECT public_customer_id FROM users WHERE id=$1',[customerId])).rows[0].public_customer_id;await db.query("INSERT INTO branches(id,name) VALUES('qa-other','Synthetic alternate branch')");await db.close();await unlink(join(dir,'db.lock'));
process.env.EASYGAS_CLIENT_DEMO='true';process.env.EASYGAS_SETTINGS_PREVIEW='true';process.env.EASYGAS_DATA_DIR=join(dir,'db');process.env.EASYGAS_OWNER_AUTO_APPROVAL='false';
const app=next({dev:true,hostname:'127.0.0.1',port:3153,dir:resolve('.data/lagos-default/release/source/apps/web'),conf:{distDir:'.next-lagos-default-qa',serverExternalPackages:['@electric-sql/pglite','pg']}});await app.prepare();if(process.env.DATABASE_URL)throw Error('Local fixture only');
await writeFile('.data/lagos-default/qa.json',JSON.stringify({dir,base:'http://127.0.0.1:3153',email:'owner@lagos-qa.invalid',password,customerId,publicId}),{mode:0o600});
createServer(app.getRequestHandler()).listen(3153,'127.0.0.1',()=>console.log('Isolated Admin rewards preview ready on port3153'));
