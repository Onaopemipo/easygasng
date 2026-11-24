import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
import { Pool } from "pg";
import { dispatch } from "../apps/web/lib/service";

async function setup(db?: DB) {
  const f = await fixture(db);
  await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
  await f.call("dispatcher", "reauth", { password: "Tracking-fixture-only-123!" });
  const vehicle = await f.call("owner", "fleet.vehicle.create", { branchId: "lagos", label: "SYNTHETIC ADMIN VAN", capacityGrams: 30000, lpgSuitable: true, operationKey: id() });
  const request = (extra = {}) => ({ driverId: f.actors.driver.id, vehicleId: vehicle.id, startOdometer: 123.5, makeAvailable: false, operationKey: id(), ...extra });
  return { ...f, vehicle, request };
}
const status = (n: number) => (e: any) => e.status === n;

test("DV-ASSIGN: owner and branch manager create a real driver trip, preserve consent/order/custody and audit the real administrator; exact retry creates one trip", async () => {
  const f = await setup();
  try {
    const before = await f.db.query("SELECT * FROM orders");
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [f.actors.driver.id]);
    const request = f.request({ makeAvailable: true });
    const r = await f.call("dispatcher", "dispatch.vehicle.assign", request);
    assert.equal((await f.call("dispatcher", "dispatch.vehicle.assign", request)).id, r.id);
    const t = await one(f.db, "SELECT * FROM driver_trips WHERE id=$1", [r.id]);
    assert.equal(t!.driver_id, f.actors.driver.id); assert.equal(t!.vehicle_id, f.vehicle.id); assert.equal(t!.location_consent, false); assert.equal(Number(t!.start_odometer), 123.5);
    assert.equal((await one(f.db, "SELECT driver_available FROM users WHERE id=$1", [f.actors.driver.id]))!.driver_available, true);
    const audits = (await f.db.query("SELECT * FROM audit_events WHERE action='dispatch.vehicle.assign'")).rows;
    assert.equal(audits.length, 1); assert.equal(audits[0].actor_id, f.actors.dispatcher.id); assert.equal(audits[0].detail.driverId, f.actors.driver.id);
    assert.deepEqual(await f.db.query("SELECT * FROM orders"), before);
    assert.equal((await f.db.query("SELECT * FROM driver_trips")).rows.length, 1);
    f.actors.driver.token = await issueSession(f.db, f.actors.driver.id, "driver");
    const snapshot = await f.call("driver", "driver.snapshot");
    assert.equal(snapshot.trip.id, r.id);
    await f.call("driver", "trip.end", { tripId: r.id, endOdometer: 124, operationKey: id() });
    const own = await f.call("owner", "dispatch.vehicle.assign", f.request()); assert.ok(own.id);
  } finally { await f.db.close?.(); }
});

test("DV-AUTH: lower roles, stale password, denied Dispatch/staff authority, anonymous and foreign branch fail closed; scoped options expose no foreign data", async () => {
  const f = await setup();
  try {
    const technician=id(); await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic technician',$2,password_hash,'technician','lagos' FROM users WHERE id=$3",[technician,technician+"@dv.test",f.actors.driver.id]); f.actors.technician={id:technician,token:await issueSession(f.db,technician)};
    await assert.rejects(() => dispatch("dispatch.vehicle.options",null,{},f.db),status(401));
    await assert.rejects(() => dispatch("dispatch.vehicle.assign",null,f.request(),f.db),status(401));
    for (const role of ["driver", "customer", "commercial", "inventory", "technician"]) {
      await assert.rejects(() => f.call(role, "dispatch.vehicle.options"), status(403));
      await assert.rejects(() => f.call(role, "dispatch.vehicle.assign", f.request()), status(403));
    }
    await f.db.query("UPDATE sessions SET verified_at=now()-interval '6 minutes' WHERE user_id=$1", [f.actors.owner.id]);
    await assert.rejects(() => f.call("owner", "dispatch.vehicle.assign", f.request()), (e: any) => e.code === "REAUTH_REQUIRED");
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await f.db.exec("INSERT INTO branches(id,name) VALUES('dv-private','Synthetic foreign branch')");
    await f.db.query("UPDATE users SET branch_id='dv-private' WHERE id=$1", [f.actors.driver.id]);
    assert.equal((await f.call("dispatcher", "dispatch.vehicle.options")).drivers.length, 0);
    await assert.rejects(() => f.call("dispatcher", "dispatch.vehicle.options", { branch: "dv-private" }), status(403));
    await assert.rejects(() => f.call("dispatcher", "dispatch.vehicle.assign", f.request()), status(403));
    await f.db.query("UPDATE users SET branch_id='lagos' WHERE id=$1", [f.actors.driver.id]);
    await f.db.query("INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'staff.manage','deny',$2,'manager','lagos')", [f.actors.dispatcher.id,f.actors.owner.id]);
    assert.equal((await f.call("dispatcher", "dispatch.vehicle.options")).canSetAvailability, false);
    await assert.rejects(() => f.call("dispatcher", "dispatch.vehicle.assign", f.request({ makeAvailable: true })), (e: any) => e.code === "PRIVILEGE_REVOKED");
    await f.db.query("INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'dispatch.manage','deny',$2,'manager','lagos')", [f.actors.dispatcher.id,f.actors.owner.id]);
    await assert.rejects(() => f.call("dispatcher", "dispatch.vehicle.assign", f.request()), (e: any) => e.code === "PRIVILEGE_REVOKED");
    await assert.rejects(() => f.call("dispatcher", "dispatch.vehicle.options"), status(403));
    assert.equal((await f.db.query("SELECT * FROM driver_trips")).rows.length, 0);
  } finally { await f.db.close?.(); }
});

test("DV-STALE: inactive/unsuitable/zero capacity/foreign vehicle, inactive branch/account, occupied driver/vehicle and invalid consent/odometer cannot assign or change availability", async () => {
  const f = await setup();
  try {
    await f.db.query("UPDATE users SET driver_available=false WHERE id=$1", [f.actors.driver.id]);
    await f.db.exec("INSERT INTO branches(id,name) VALUES('dv-other','Synthetic other')");
    await assert.rejects(() => f.db.query("UPDATE driver_vehicles SET capacity_grams=0 WHERE id=$1", [f.vehicle.id]), (e:any) => e.code === "23514");
    for (const [column, value] of [["active", false], ["lpg_suitable", false], ["branch_id", "dv-other"]] as const) {
      await f.db.query(`UPDATE driver_vehicles SET ${column}=$1 WHERE id=$2`, [value, f.vehicle.id]);
      await assert.rejects(() => f.call("owner", "dispatch.vehicle.assign", f.request({ makeAvailable: true })), status(409));
      assert.equal((await one(f.db,"SELECT driver_available FROM users WHERE id=$1",[f.actors.driver.id]))!.driver_available,false);
      await f.db.query("UPDATE driver_vehicles SET active=true,lpg_suitable=true,capacity_grams=30000,branch_id='lagos' WHERE id=$1",[f.vehicle.id]);
    }
    await f.db.exec("UPDATE branches SET active=false WHERE id='lagos'");
    await assert.rejects(() => f.call("owner", "dispatch.vehicle.assign", f.request()),status(409));
    await f.db.exec("UPDATE branches SET active=true WHERE id='lagos'");
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [f.actors.driver.id]);
    await assert.rejects(() => f.call("owner", "dispatch.vehicle.assign", f.request()),status(409));
    await f.db.query("UPDATE users SET active=true WHERE id=$1", [f.actors.driver.id]);
    for (const extra of [{locationConsent:true},{startOdometer:-1},{startOdometer:10000001},{driverId:f.actors.customer.id}]) await assert.rejects(() => f.call("owner","dispatch.vehicle.assign",f.request(extra)));
    const first=await f.call("owner","dispatch.vehicle.assign",f.request());
    assert.equal((await one(f.db,"SELECT driver_available FROM users WHERE id=$1",[f.actors.driver.id]))!.driver_available,false);
    await assert.rejects(() => f.call("owner","dispatch.vehicle.assign",f.request()),status(409));
    const another = id();await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic second',$2,password_hash,'driver','lagos' FROM users WHERE id=$3",[another,another+'@dv.test',f.actors.driver.id]);
    await assert.rejects(() => f.call("owner","dispatch.vehicle.assign",f.request({driverId:another})),status(409));
    await assert.rejects(() => f.call("driver","trip.start",{vehicleId:f.vehicle.id,startOdometer:124,locationConsent:false,operationKey:id()}),status(409));
    assert.equal((await f.db.query("SELECT id FROM driver_trips")).rows.length,1);assert.ok(first.id);
  } finally { await f.db.close?.(); }
});

test("DV-RELEASE: production field-operation hold denies reads' write capability and new writes; required operation keys and request fingerprints stay enforced", async () => {
  const f=await setup(),env={...process.env};
  try {
    const {operationKey,...noKey}=f.request();
    await assert.rejects(()=>f.call("owner","dispatch.vehicle.assign",noKey),(e:any)=>e.code==='OPERATION_KEY_REQUIRED');
    process.env.NODE_ENV='production';process.env.EASYGAS_FIELD_OPERATIONS_ENABLED='false';
    assert.equal((await f.call("owner","dispatch.vehicle.options")).writesEnabled,false);
    await assert.rejects(()=>f.call("owner","dispatch.vehicle.assign",f.request()),status(503));
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED='true';
    const request=f.request();await f.call("owner","dispatch.vehicle.assign",request);
    await assert.rejects(()=>f.call("owner","dispatch.vehicle.assign",{...request,startOdometer:999}),(e:any)=>e.code==='IDEMPOTENCY_CONFLICT');
  }finally{process.env=env;await f.db.close?.();}
});

test("DV-PG: independent admin/self-start, same-vehicle and identical-retry races create one active trip and one audited assignment", {skip:process.env.EASYGAS_ENABLE_LOCAL_PG_TESTS==='yes'&&process.env.EASYGAS_TEST_POSTGRES_URL?false:'Explicit disposable PostgreSQL required; PGlite is not concurrency evidence'}, async()=>{
  const url=new URL(process.env.EASYGAS_TEST_POSTGRES_URL!);assert.ok(['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.pathname.startsWith('/easygas_test')&&!process.env.DATABASE_URL);
  const schema='easygas_test_'+id().replaceAll('-',''),admin=new Pool({connectionString:url.toString(),max:1});await admin.query(`CREATE SCHEMA ${schema}`);
  const pool=new Pool({connectionString:url.toString(),max:6,options:`-c search_path=${schema},pg_catalog -c lock_timeout=5000`});
  const db:DB={query:async(q,p)=>(await pool.query(q,p)) as any,exec:q=>pool.query(q),transaction:async(fn)=>{const tx=await pool.connect();try{await tx.query('BEGIN');const r=await fn({query:async(q,p)=>(await tx.query(q,p)) as any,exec:q=>tx.query(q)});await tx.query('COMMIT');return r;}catch(e){await tx.query('ROLLBACK');throw e;}finally{tx.release();}}};
  try{
    const f=await setup(db);
    const race=await Promise.allSettled([f.call('owner','dispatch.vehicle.assign',f.request()),f.call('driver','trip.start',{vehicleId:f.vehicle.id,startOdometer:1,locationConsent:false,operationKey:id()})]);
    assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal((race.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.status,409);
    let t=(await db.query('SELECT * FROM driver_trips WHERE ended_at IS NULL')).rows[0];await f.call('driver','trip.end',{tripId:t.id,endOdometer:200,operationKey:id()});
    const second=id();await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic race driver',$2,password_hash,'driver','lagos' FROM users WHERE id=$3",[second,second+'@dv.test',f.actors.driver.id]);
    const vehicleRace=await Promise.allSettled([f.actors.driver.id,second].map(driverId=>f.call('owner','dispatch.vehicle.assign',f.request({driverId,makeAvailable:true}))));
    assert.equal(vehicleRace.filter(r=>r.status==='fulfilled').length,1);assert.equal((vehicleRace.find(r=>r.status==='rejected') as PromiseRejectedResult).reason.status,409);
    t=(await db.query('SELECT * FROM driver_trips WHERE ended_at IS NULL')).rows[0];
    await db.query('UPDATE driver_trips SET ended_at=now(),end_odometer=start_odometer WHERE id=$1',[t.id]);
    const request=f.request();const retry=await Promise.all([f.call('owner','dispatch.vehicle.assign',request),f.call('owner','dispatch.vehicle.assign',request)]);assert.equal(retry[0].id,retry[1].id);
    assert.equal(Number((await one(db,"SELECT count(*) n FROM audit_events WHERE action='dispatch.vehicle.assign' AND target=$1",[retry[0].id]))!.n),1);
  }finally{await pool.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
