import test, { after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fixture } from "./helpers/order-tracking-fixture";
import { actor, id, digest, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import {
  vehicleFixture,
  restoreVehicleEnv,
} from "./helpers/vehicle-products-fixture";
import { canonicalRequest } from "../apps/web/lib/business-operation";
import { type DB, type SQL } from "../apps/web/lib/db";
const temp = await mkdtemp(join(tmpdir(), "easygas-orders-baseline-"));
after(() => rm(temp, { recursive: true, force: true }));
// Compare the complete response against the actual published implementation, not a copied expectation.
const baseline = execFileSync(
  "git",
  ["show", "c7babcf1fe78334d69e3ba1302a67945d7e2e518:apps/web/lib/service.ts"],
  { encoding: "utf8", maxBuffer: 2e6 },
);
const start =
  baseline.indexOf('      if (action === "orders") {') +
  '      if (action === "orders") {'.length;
const end = baseline.indexOf('      if (action === "tracking.drivers")', start);
const block = baseline.slice(start, end).replace(/\n      }\s*$/, "");
const local = (p: string) => JSON.stringify(resolve("apps/web/lib/" + p));
const imports = `import {z} from 'zod';import {one,type SQL} from ${local("db.ts")};import {allow,digest,type Actor} from ${local("auth.ts")};import {canonicalRequest} from ${local("business-operation.ts")};import {deliveryManifest} from ${local("order-tracking.ts")};import {customerRiderLocation} from ${local("customer-rider-location.ts")};import {unavailableRiderLocation} from ${JSON.stringify(resolve("packages/business-rules/src/rider-location.ts"))};`;
// Resolve zod from the workspace rather than the OS temporary directory.
await writeFile(
  join(temp, "baseline.ts"),
  imports.replace(
    "from 'zod'",
    `from ${JSON.stringify(resolve("node_modules/zod/index.js"))}`,
  ) +
    `export async function legacyOrders(tx:SQL,user:Actor,input:any){${block}}`,
);
const { legacyOrders } = await import(
  pathToFileURL(join(temp, "baseline.ts")).href
);
function measured(db: DB, delay = 0) {
  const stats = { queries: 0 };
  const wrap = (tx: SQL): SQL => ({
    exec: (q) => tx.exec(q),
    query: async (q, p) => {
      stats.queries++;
      if (delay) await new Promise((r) => setTimeout(r, delay));
      return tx.query(q, p);
    },
  });
  return {
    db: {
      ...db,
      transaction: <T>(fn: (tx: SQL) => Promise<T>) =>
        db.transaction((tx) => fn(wrap(tx))),
    } as DB,
    stats,
  };
}
const json = (v: any) => JSON.parse(JSON.stringify(v));

test("LOAD-ORDERS: full published contracts match for owner, branch staff, driver and customers while list query count stays bounded", async () => {
  const f = await fixture();
  try {
    await f.db.exec(
      "UPDATE inventory SET quantity=1000;UPDATE settings SET value='1000' WHERE key='delivery.capacity'",
    );
    const first = await f.assigned();
    for (let i = 0; i < 23; i++) await f.make();
    // Include another branch and another customer's order: neither may leak into restricted reads.
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('ikeja','Synthetic second branch') ON CONFLICT DO NOTHING",
    );
    const otherCustomer = id(),
      otherOrder = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Other synthetic customer',$1||'@load.example.test',password_hash,'customer','ikeja' FROM users WHERE id=$2",
      [otherCustomer, f.actors.customer.id],
    );
    await f.db.query(
      "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,instructions,driver_id,idempotency_key,request_hash,delivery_code_hash,delivery_code_expires_at) SELECT $1,$2,$3,'ikeja','placed',payment_status,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,instructions,NULL,$1,request_hash,delivery_code_hash,delivery_code_expires_at FROM orders WHERE id=$4",
      [otherOrder, "LOAD-" + otherOrder, otherCustomer, first.id],
    );
    const timings = [];
    for (const role of [
      "owner",
      "dispatcher",
      "inventory",
      "driver",
      "customer",
      "commercial",
    ]) {
      const old = measured(f.db, 1),
        fresh = measured(f.db, 1);
      const oldStart = performance.now();
      const expected = await old.db.transaction(async (tx) =>
        legacyOrders(tx, await actor(tx, f.actors[role].token), {}),
      );
      const oldMs = Math.round(performance.now() - oldStart);
      const newStart = performance.now();
      const actual = await dispatch(
        "orders",
        f.actors[role].token,
        {},
        fresh.db,
      );
      const newMs = Math.round(performance.now() - newStart);
      assert.deepEqual(
        json(actual),
        json(expected),
        role + " complete response",
      );
      assert.ok(fresh.stats.queries <= 14, role + " bounded round trips");
      if (["dispatcher", "inventory", "driver", "customer"].includes(role))
        assert.ok(actual.every((o: any) => o.branch_id === "lagos"));
      for (const o of actual) assert.equal("delivery_code_hash" in o, false);
      timings.push({
        role,
        rows: actual.length,
        legacyQueries: old.stats.queries,
        batchedQueries: fresh.stats.queries,
        legacyMs: oldMs,
        batchedMs: newMs,
        syntheticRoundTripMs: 1,
      });
    }
    const owner = await dispatch(
      "orders",
      f.actors.owner.token,
      { id: first.id },
      f.db,
    );
    assert.equal(owner.length, 1);
    assert.equal(owner[0].id, first.id);
    await assert.rejects(() =>
      dispatch("orders", f.actors.owner.token, { id: "not-a-uuid" }, f.db),
    );
    const absent = measured(f.db);
    assert.deepEqual(
      await dispatch(
        "orders",
        f.actors.customer.token,
        { id: otherOrder },
        absent.db,
      ),
      [],
    );
    assert.ok(absent.stats.queries <= 3);
    const technician = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Synthetic technician',$1||'@load.example.test',password_hash,'technician','lagos' FROM users WHERE id=$2",
      [technician, f.actors.customer.id],
    );
    await assert.rejects(
      () => dispatch("orders", null, {}, f.db),
      (e: any) => e.status === 401,
    );
    const technicianToken = await issueSession(f.db, technician);
    await assert.rejects(
      () => dispatch("orders", technicianToken, {}, f.db),
      (e: any) => e.status === 403,
    );
    await f.db.query(
      "INSERT INTO staff_privilege_overrides(user_id,privilege,effect,changed_by,role_at_change,branch_at_change) VALUES($1,'orders.view','deny',$2,'finance','lagos')",
      [f.actors.inventory.id, f.actors.owner.id],
    );
    await assert.rejects(
      () => dispatch("orders", f.actors.inventory.token, {}, f.db),
      (e: any) => e.status === 403,
    );
    for (let i = 0; i < 80; i++) await f.make();
    const fullOld = measured(f.db, 1),
      fullNew = measured(f.db, 1);
    const oldStart = performance.now();
    const old100 = await fullOld.db.transaction(async (tx) =>
      legacyOrders(tx, await actor(tx, f.actors.owner.token), {}),
    );
    const old100Ms = Math.round(performance.now() - oldStart);
    const newStart = performance.now();
    const new100 = await dispatch(
      "orders",
      f.actors.owner.token,
      {},
      fullNew.db,
    );
    const new100Ms = Math.round(performance.now() - newStart);
    assert.equal(new100.length, 100);
    assert.deepEqual(json(new100), json(old100));
    assert.ok(fullNew.stats.queries <= 14);
    timings.push({
      role: "owner-latest100",
      rows: new100.length,
      legacyQueries: fullOld.stats.queries,
      batchedQueries: fullNew.stats.queries,
      legacyMs: old100Ms,
      batchedMs: new100Ms,
      syntheticRoundTripMs: 1,
    });
    if (process.env.EASYGAS_RECORD_PERFORMANCE === "true")
      await writeFile(
        "docs/loading-performance/evidence/order-query-comparison.json",
        JSON.stringify(
          {
            baselineCommit: "c7babcf1fe78334d69e3ba1302a67945d7e2e518",
            actualPublishedImplementationComparison: true,
            timings,
            hostedPerformanceClaim: false,
          },
          null,
          2,
        ) + "\n",
      );
  } finally {
    await f.db.close?.();
  }
});

async function publishedReader(
  file: string,
  marker: string,
  next: string,
  name: string,
  imports: string,
) {
  const source = execFileSync(
    "git",
    ["show", "c7babcf1fe78334d69e3ba1302a67945d7e2e518:" + file],
    { encoding: "utf8", maxBuffer: 2e6 },
  );
  const start = source.indexOf(marker) + marker.length;
  assert.ok(start > marker.length);
  const end = source.indexOf(next, start);
  assert.ok(end > start);
  const body = source.slice(start, end).replace(/\n\s*}\s*$/, "");
  const target = join(temp, name + ".ts");
  await writeFile(
    target,
    imports + `export async function ${name}(tx:any,user:any){${body}}`,
  );
  return (await import(pathToFileURL(target).href))[name];
}
test("LOAD-CUSTODY: fleet and manifest batches retain published data, serials, custody history and scoped driver results", async () => {
  const env = { ...process.env },
    f = await vehicleFixture();
  try {
    for (let i = 0; i < 13; i++)
      await f.run("inventory", "manifest.issue", {
        tripId: f.trip.id,
        productId: "hose",
        quantity: 1,
        unitWeightGrams: 500,
        evidence: "Synthetic measured package only",
        reason: "Synthetic performance verification",
      });
    for (let i = 0; i < 20; i++) {
      const tripId = id();
      await f.db.query(
        "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,end_odometer,location_consent,ended_at) SELECT $1,driver_id,vehicle_id,branch_id,100,120,false,now() FROM driver_trips WHERE id=$2",
        [tripId, f.trip.id],
      );
      await f.db.query(
        'INSERT INTO trip_events(id,trip_id,sequence,kind,recorded_at,payload,actor_id) VALUES($1,$2,1,\'fuel\',now(),\'{"litres":1,"costKobo":1000,"receipt":"SYNTHETIC"}\',$3)',
        [id(), tripId, f.actors.driver.id],
      );
    }
    const imports = `import {allow} from ${local("auth.ts")};`;
    const legacyManifest = await publishedReader(
      "apps/web/lib/vehicle-products.ts",
      '  if (action === "manifest.summary") {',
      "  if (\n    process.env.EASYGAS_DOORSTEP_ENABLED",
      "legacyManifest",
      imports,
    );
    const legacyFleet = await publishedReader(
      "apps/web/lib/driver-operations.ts",
      '  if (action === "fleet.summary") {',
      '  if (action === "dispatch.board")',
      "legacyFleet",
      imports +
        `import {recentTripFix,tripLocationEvidence,tripMetrics} from ${JSON.stringify(resolve("packages/business-rules/src/trip-metrics.ts"))};`,
    );
    const readings = [];
    const now = Date.now();
    const previousNow = Date.now;
    Date.now = () => now;
    try {
      for (const role of ["owner", "dispatcher", "inventory", "driver"])
        for (const [action, legacy] of [
          ["manifest.summary", legacyManifest],
          ["fleet.summary", legacyFleet],
        ] as const) {
          const old = measured(f.db),
            fresh = measured(f.db);
          const expected = await old.db.transaction(async (tx) =>
            legacy(tx, await actor(tx, f.actors[role].token)),
          );
          const actual = await dispatch(
            action,
            f.actors[role].token,
            {},
            fresh.db,
          );
          assert.deepEqual(
            json(actual),
            json(expected),
            role + " " + action + " complete contract",
          );
          assert.ok(
            fresh.stats.queries <= (action === "fleet.summary" ? 6 : 7),
          );
          readings.push({
            role,
            action,
            legacyQueries: old.stats.queries,
            batchedQueries: fresh.stats.queries,
          });
        }
    } finally {
      Date.now = previousNow;
    }
    // Exercise the richer order contract as well: gas, cylinder serial, delivery evidence and destination.
    const attempt = (
      await f.db.query("SELECT id FROM delivery_attempts WHERE order_id=$1", [
        f.order.id,
      ])
    ).rows[0];
    await f.db.query(
      "INSERT INTO delivery_evidence(id,attempt_id,actor_id,kind,detail) VALUES($1,$2,$3,'pickup','{\"reason\":\"Synthetic measured custody\"}')",
      [id(), attempt.id, f.actors.driver.id],
    );
    const order = (
      await f.db.query("SELECT address,branch_id FROM orders WHERE id=$1", [
        f.order.id,
      ])
    ).rows[0];
    await f.db.query(
      "INSERT INTO dispatch_destinations(id,order_id,branch_id,revision,address_hash,latitude,longitude,evidence,confirmed_by) VALUES($1,$2,$3,1,$4,6.5,3.4,$5,$6)",
      [
        id(),
        f.order.id,
        order.branch_id,
        digest(canonicalRequest(order.address)),
        "Synthetic address confirmation only",
        f.actors.owner.id,
      ],
    );
    for (const role of ["owner", "driver", "customer"]) {
      const expected = await f.db.transaction(async (tx) =>
        legacyOrders(tx, await actor(tx, f.actors[role].token), {}),
      );
      const actual = await dispatch("orders", f.actors[role].token, {}, f.db);
      assert.deepEqual(
        json(actual),
        json(expected),
        role + " rich order contract",
      );
    }
    if (process.env.EASYGAS_RECORD_PERFORMANCE === "true")
      await writeFile(
        "docs/loading-performance/evidence/custody-query-comparison.json",
        JSON.stringify(
          {
            baselineCommit: "c7babcf1fe78334d69e3ba1302a67945d7e2e518",
            readings,
            contractsMatch: true,
          },
          null,
          2,
        ) + "\n",
      );
  } finally {
    restoreVehicleEnv(env);
    await f.db.close?.();
  }
});
