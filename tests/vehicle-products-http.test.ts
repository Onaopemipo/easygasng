import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import {
  vehicleFixture,
  restoreVehicleEnv,
} from "./helpers/vehicle-products-fixture";
import { id } from "../apps/web/lib/auth";
test("MANIFEST-HTTP01: actual handlers allow scoped driver receipt but reject customer access and restricted-driver stock issue", async () => {
  const env = { ...process.env },
    f = await vehicleFixture(),
    g = globalThis as any,
    old = g.easygasDb,
    version = g.easygasLocalVersion;
  try {
    g.easygasDb = Promise.resolve(f.db);
    g.easygasLocalVersion = 73;
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    await f.db.query(
      "UPDATE sessions SET driver_delivery_only=true WHERE user_id=$1",
      [f.actors.driver.id],
    );
    const request = async (role: string, action: string, data?: any) => {
      const headers = {
        authorization: "Bearer " + f.actors[role].token,
        "content-type": "application/json",
        "x-easygas-client": "native",
      };
      return data === undefined
        ? GET(
            new NextRequest("http://localhost:3003/api/" + action, { headers }),
            { params: Promise.resolve({ action }) },
          )
        : POST(
            new NextRequest("http://localhost:3003/api/" + action, {
              method: "POST",
              headers,
              body: JSON.stringify(data),
            }),
            { params: Promise.resolve({ action }) },
          );
    };
    assert.equal((await request("customer", "manifest.summary")).status, 403);
    const summary = await request("driver", "manifest.summary");
    assert.equal(summary.status, 200);
    assert.match(summary.headers.get("cache-control")!, /no-store/);
    assert.deepEqual((await summary.json()).products, []);
    const issue = {
      tripId: f.trip.id,
      productId: "hose",
      quantity: 1,
      unitWeightGrams: 500,
      evidence: "Synthetic actual stock evidence",
      reason: "Synthetic authorized stock issue",
    };
    assert.equal(
      (
        await request("driver", "manifest.issue", {
          ...issue,
          operationKey: id(),
        })
      ).status,
      403,
    );
    const load = await f.run("inventory", "manifest.issue", issue);
    const ack = {
      manifestId: load.id,
      version: 1,
      quantity: 1,
      serialIds: [],
      evidence: issue.evidence,
      reason: issue.reason,
      operationKey: id(),
    };
    assert.equal(
      (await request("driver", "manifest.acknowledge", ack)).status,
      200,
    );
    assert.equal(
      (await request("driver", "manifest.acknowledge", ack)).status,
      200,
    );
    assert.equal((await request("driver", "manifest.summary", {})).status, 405);
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM vehicle_product_events WHERE kind='manifest.acknowledged' AND load_id=$1",
          [load.id],
        )
      ).rows.length,
      1,
    );
  } finally {
    g.easygasDb = old;
    g.easygasLocalVersion = version;
    restoreVehicleEnv(env);
    if (env.EASYGAS_BACKGROUND_JOBS === undefined)
      delete process.env.EASYGAS_BACKGROUND_JOBS;
    else process.env.EASYGAS_BACKGROUND_JOBS = env.EASYGAS_BACKGROUND_JOBS;
    await f.db.close?.();
  }
});
