import { localSchemaRevision } from "../apps/web/lib/db";
import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { NextRequest } from "next/server";
import { GET as media } from "../apps/web/app/api/media/[id]/route";
import { fixture } from "./helpers/order-tracking-fixture";
import { actor, id } from "../apps/web/lib/auth";
import { prepareImage } from "../apps/web/lib/media";
import {
  attachDeliveryPhoto,
  latestDeliveryPhoto,
} from "../apps/web/lib/delivery-photos";

test("DDI-PHOTO01: customer latest proof follows completed canonical deliveries; expired private URLs deny access while bytes/history remain", async () => {
  const f = await fixture(),
    g = globalThis as any,
    previous = {
      db: g.easygasDb,
      version: g.easygasLocalVersion,
      jobs: process.env.EASYGAS_BACKGROUND_JOBS,
    };
  try {
    const driver = await actor(f.db, f.actors.driver.token),
      customer = await actor(f.db, f.actors.customer.token);
    const deliver = async (background: string) => {
      const order = await f.ready();
      const bytes = await prepareImage(
        await sharp({
          create: { width: 10, height: 10, channels: 3, background },
        })
          .png()
          .toBuffer(),
      );
      const photo = await f.db.transaction((tx) =>
        attachDeliveryPhoto(
          tx,
          driver,
          order.id,
          bytes,
          "Synthetic delivery proof",
          true,
        ),
      );
      const owned = (await f.call("customer", "orders", { id: order.id }))[0];
      await f.call("driver", "delivery.complete", {
        orderId: order.id,
        version: Number(order.tracking_version),
        operationKey: id(),
        code: owned.confirmation_code,
        handover: true,
        collectedKobo: Number(order.total_kobo),
      });
      return { order, photo };
    };
    const first = await deliver("green"),
      second = await deliver("blue");
    assert.equal(
      (await latestDeliveryPhoto(f.db, customer))!.id,
      second.photo.id,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM delivery_photos WHERE id IN ($1,$2)",
            [first.photo.id, second.photo.id],
          )
        ).rows[0].n,
      ),
      2,
    );
    await assert.rejects(
      () => latestDeliveryPhoto(f.db, customer, f.actors.commercial.id),
      /not found/i,
    );
    const expired = id();
    await f.db.query(
      `INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until) SELECT $1,$2,a.id,p.actor_id,p.data,p.sha256,'Expired synthetic proof',true,now()-interval '1 day' FROM delivery_photos p JOIN delivery_attempts a ON a.order_id=$2 AND a.state='delivered' WHERE p.id=$3`,
      [expired, second.order.id, first.photo.id],
    );
    assert.equal(
      (await latestDeliveryPhoto(f.db, customer))!.id,
      second.photo.id,
    );
    g.easygasDb = Promise.resolve(f.db);
    g.easygasLocalVersion = localSchemaRevision;
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    const request = (photoId: string, token?: string) =>
      media(
        new NextRequest("http://localhost:3003/api/media/" + photoId, {
          headers: token ? { authorization: "Bearer " + token } : {},
        }),
        { params: Promise.resolve({ id: photoId }) },
      );
    const current = await request(second.photo.id, f.actors.customer.token);
    assert.equal(current.status, 200);
    assert.equal(current.headers.get("cache-control"), "private, no-store");
    assert.equal((await request(second.photo.id)).status, 401);
    assert.equal(
      (await request(second.photo.id, f.actors.commercial.token)).status,
      404,
    );
    assert.equal((await request(expired, f.actors.customer.token)).status, 404);
    assert.ok(
      Number(
        (
          await f.db.query(
            "SELECT octet_length(data) bytes FROM delivery_photos WHERE id=$1",
            [expired],
          )
        ).rows[0].bytes,
      ) > 0,
    );
  } finally {
    g.easygasDb = previous.db;
    g.easygasLocalVersion = previous.version;
    if (previous.jobs === undefined) delete process.env.EASYGAS_BACKGROUND_JOBS;
    else process.env.EASYGAS_BACKGROUND_JOBS = previous.jobs;
    await f.db.close?.();
  }
});
