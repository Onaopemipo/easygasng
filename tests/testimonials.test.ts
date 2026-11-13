import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { authorizeMedia } from "../apps/web/lib/media";
import {
  attachTestimonialPhoto,
  testimonialPhotoPublished,
} from "../apps/web/lib/testimonials";
import { one } from "../apps/web/lib/db";
async function purchase(f: Awaited<ReturnType<typeof fixture>>, paid = true) {
  const oid = id();
  await f.db.query(
    "INSERT INTO orders(id,reference,customer_id,branch_id,status,payment_status,delivery_code_hash,delivery_code_expires_at,payment_method,subtotal_kobo,delivery_kobo,total_kobo,address,delivery_date,delivery_window,idempotency_key,request_hash) VALUES($1,$1,$2,'lagos','delivered',$3,'synthetic',now()+interval '1 day','cash',1000,0,1000,'{}','2026-11-01','AM',$1,'synthetic')",
    [oid, f.actors.customer.id, paid ? "verified" : "pending"],
  );
  if (paid)
    await f.db.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$1,1000,'cash',$3)",
      [id(), oid, f.actors.finance.id],
    );
  return oid;
}
const feedback = {
  rating: 1,
  body: "The delivery arrived later than I expected, but the staff helped.",
  nameStyle: "custom",
  displayName: "Customer A",
  consent: true,
};
test("TM-01: eligible purchase saves a private draft; publication requires separate approval", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    assert.equal(r.status, "DRAFT");
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
    r = await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "PENDING_REVIEW",
    });
    await assert.rejects(
      f.call("owner", "testimonial.transition", {
        id: r.id,
        revision: r.revision,
        status: "PUBLISHED",
        reason: "Independent publication review",
      }),
    );
    r = await f.call("owner", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "APPROVED",
      reason: "Authentic feedback with explicit consent",
    });
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
    r = await f.call("owner", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "PUBLISHED",
      reason: "Approved original feedback for publication",
    });
    const publicRows = await dispatch("testimonials.public", null, {}, f.db);
    assert.equal(publicRows.length, 1);
    assert.equal(publicRows[0].rating, 1);
    assert.deepEqual(Object.keys(publicRows[0]).sort(), [
      "body",
      "display_name",
      "image_url",
      "public_location",
      "rating",
    ]);
    r = await f.call("customer", "testimonial.edit", {
      id: r.id,
      revision: r.revision,
      content: {
        ...feedback,
        body: "The support team followed up on my delivery experience.",
      },
    });
    assert.equal(r.status, "DRAFT");
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT count(*) AS n FROM testimonial_versions WHERE testimonial_id=$1",
            [r.id],
          )
        )?.n,
      ),
      2,
    );
    await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "WITHDRAWN",
    });
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
  } finally {
    await f.db.close?.();
  }
});
test("TM-02: ineligible, duplicate, ownership, consent and unsafe input are rejected", async () => {
  const f = await fixture();
  try {
    const unpaid = await purchase(f, false);
    await assert.rejects(
      f.call("customer", "testimonial.create", {
        orderId: unpaid,
        content: feedback,
      }),
    );
    const paid = await purchase(f);
    const r = await f.call("customer", "testimonial.create", {
      orderId: paid,
      content: { ...feedback, consent: false },
    });
    await assert.rejects(
      f.call("customer", "testimonial.create", {
        orderId: paid,
        content: feedback,
      }),
    );
    await assert.rejects(
      f.call("customer", "testimonial.transition", {
        id: r.id,
        revision: 1,
        status: "PENDING_REVIEW",
      }),
    );
    await assert.rejects(
      f.call("commercial", "testimonial.edit", {
        id: r.id,
        revision: 1,
        content: feedback,
      }),
    );
    await assert.rejects(
      f.call("customer", "testimonial.transition", {
        id: r.id,
        revision: 1,
        status: "APPROVED",
      }),
    );
    await assert.rejects(f.call("customer", "testimonials.manage"));
    await assert.rejects(
      f.call("customer", "testimonial.edit", {
        id: r.id,
        revision: 1,
        content: {
          ...feedback,
          body: "<script>alert(document.cookie)</script>",
        },
      }),
    );
    await assert.rejects(
      f.call("customer", "testimonial.edit", {
        id: r.id,
        revision: 1,
        content: {
          ...feedback,
          body: "Call me on 08012345678 for the full story.",
        },
      }),
    );
    await assert.rejects(
      f.db.query(
        "UPDATE testimonial_versions SET body='Tampered feedback history' WHERE testimonial_id=$1",
        [r.id],
      ),
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-15: stale moderation cannot publish or overwrite a newer customer version", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    r = await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: 1,
      status: "PENDING_REVIEW",
    });
    const old = r.revision;
    await f.call("customer", "testimonial.edit", {
      id: r.id,
      revision: old,
      content: feedback,
    });
    await assert.rejects(
      f.call("owner", "testimonial.transition", {
        id: r.id,
        revision: old,
        status: "APPROVED",
        reason: "Stale independent review attempt",
      }),
      /changed/,
    );
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
    assert.ok(
      Number(
        (
          await one(
            f.db,
            "SELECT count(*) AS n FROM testimonial_events WHERE testimonial_id=$1",
            [r.id],
          )
        )?.n,
      ) >= 3,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-09: withdrawing published consent immediately removes public feedback and cannot be reversed by a moderator", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    for (const status of ["PENDING_REVIEW", "APPROVED", "PUBLISHED"])
      r = await f.call(
        status === "PENDING_REVIEW" ? "customer" : "owner",
        "testimonial.transition",
        {
          id: r.id,
          revision: r.revision,
          status,
          ...(status === "PENDING_REVIEW"
            ? {}
            : { reason: "Synthetic independent moderation review" }),
        },
      );
    assert.equal(
      (await dispatch("testimonials.public", null, {}, f.db)).length,
      1,
    );
    r = await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "WITHDRAWN",
    });
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
    await assert.rejects(
      f.call("owner", "testimonial.transition", {
        id: r.id,
        revision: r.revision,
        status: "PUBLISHED",
        reason: "Attempt to restore withdrawn consent",
      }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-16: notification failure rolls back the entire transition and safe retry produces one event", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    const r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    const failing = {
      ...f.db,
      transaction: async (fn: any) =>
        f.db.transaction((tx) =>
          fn({
            ...tx,
            exec: (q: string) => tx.exec(q),
            query: async (q: string, p: any[]) => {
              if (q.startsWith("INSERT INTO notifications"))
                throw new Error("Injected notification write failure");
              return tx.query(q, p);
            },
          }),
        ),
    };
    const request = {
      id: r.id,
      revision: r.revision,
      status: "PENDING_REVIEW",
    };
    await assert.rejects(
      dispatch(
        "testimonial.transition",
        f.actors.customer.token,
        request,
        failing,
      ),
    );
    assert.equal(
      (
        await one(
          f.db,
          "SELECT status FROM customer_testimonials WHERE id=$1",
          [r.id],
        )
      )?.status,
      "DRAFT",
    );
    await f.call("customer", "testimonial.transition", request);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT count(*) AS n FROM testimonial_events WHERE testimonial_id=$1 AND to_status='PENDING_REVIEW'",
            [r.id],
          )
        )?.n,
      ),
      1,
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-11: photos remain private until separately consented and moderated; withdrawal revokes public image access", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    const actor = {
      ...(await one(f.db, "SELECT * FROM users WHERE id=$1", [
        f.actors.customer.id,
      ]))!,
      session_id: "fixture",
    } as any;
    const other = { ...actor, id: f.actors.commercial.id };
    await assert.rejects(
      authorizeMedia(f.db, actor, { testimonialId: r.id }, true),
      /enabled/,
    );
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{imagesEnabled}','true'::jsonb) WHERE key='testimonials.policy'",
    );
    await authorizeMedia(f.db, actor, { testimonialId: r.id }, true);
    await assert.rejects(
      authorizeMedia(f.db, other, { testimonialId: r.id }, true),
    );
    const mid = id();
    await f.db.query(
      "INSERT INTO media_assets(id,owner_id,testimonial_id,mime,data,alt) VALUES($1,$2,$3,'image/webp',$4,'Synthetic fixture photo')",
      [mid, actor.id, r.id, new Uint8Array([1, 2, 3])],
    );
    await f.db.transaction((tx) =>
      attachTestimonialPhoto(tx, actor, r.id, mid),
    );
    assert.equal(await testimonialPhotoPublished(f.db, mid), false);
    r = await one(f.db, "SELECT * FROM customer_testimonials WHERE id=$1", [
      r.id,
    ]);
    for (const status of ["PENDING_REVIEW", "APPROVED", "PUBLISHED"])
      r = await f.call(
        status === "PENDING_REVIEW" ? "customer" : "owner",
        "testimonial.transition",
        {
          id: r.id,
          revision: r.revision,
          status,
          ...(status === "PENDING_REVIEW"
            ? {}
            : { reason: "Synthetic independent consent and photo review" }),
        },
      );
    assert.equal(await testimonialPhotoPublished(f.db, mid), true);
    assert.equal(
      (await dispatch("testimonials.public", null, {}, f.db))[0].image_url,
      "/api/media/" + mid,
    );
    await assert.rejects(
      authorizeMedia(f.db, actor, { testimonialId: r.id }, true),
      /draft/,
    );
    await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "WITHDRAWN",
    });
    assert.equal(await testimonialPhotoPublished(f.db, mid), false);
    await assert.rejects(authorizeMedia(f.db, other, { testimonialId: r.id }));
  } finally {
    await f.db.close?.();
  }
});
test("TM-RUNTIME: the restricted server can run publication, browser roles cannot read records, and history cannot be changed", async () => {
  const { createDatabase } = await import("../apps/web/lib/db");
  const { readFile } = await import("node:fs/promises");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db),
      orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    for (const status of ["PENDING_REVIEW", "APPROVED", "PUBLISHED"])
      r = await f.call(
        status === "PENDING_REVIEW" ? "customer" : "owner",
        "testimonial.transition",
        {
          id: r.id,
          revision: r.revision,
          status,
          ...(status === "PENDING_REVIEW"
            ? {}
            : { reason: "Restricted runtime independent review" }),
        },
      );
    assert.equal(
      (await dispatch("testimonials.public", null, {}, db)).length,
      1,
    );
    await assert.rejects(
      db.query(
        "UPDATE testimonial_versions SET body='Rewritten original' WHERE testimonial_id=$1",
        [r.id],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query("UPDATE testimonial_events SET reason='Rewritten reason'"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("DELETE FROM customer_testimonials"),
      /permission denied/,
    );
    await db.exec(
      "RESET ROLE; CREATE ROLE testimonial_browser NOLOGIN; SET ROLE testimonial_browser",
    );
    await assert.rejects(
      db.query("SELECT * FROM easygas_private.customer_testimonials"),
      /permission denied/,
    );
  } finally {
    await db.close?.();
  }
});
test("HP-CONTENT: editorial and testimonial policy changes reuse independent approvals and reject unsafe content", async () => {
  const f = await fixture();
  try {
    const { issueSession, hashPassword } = await import("../apps/web/lib/auth");
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic Manager',$2,$3,'manager','lagos')",
      [uid, uid + "@example.test", hashPassword("Services-fixture-only-123!")],
    );
    f.actors.manager = { id: uid, token: await issueSession(f.db, uid) };
    const c = (await one(
      f.db,
      "SELECT value FROM settings WHERE key='website.content'",
    ))!.value;
    await assert.rejects(
      f.call("manager", "setting.propose", {
        key: "website.content",
        scope: "lagos",
        version: 1,
        value: { ...c, heroImage: "javascript:alert(1)" },
        reason: "Synthetic unsafe image URL rejection",
      }),
    );
    const req = await f.call("manager", "setting.propose", {
      key: "website.content",
      scope: "lagos",
      version: 1,
      value: { ...c, heroSubheading: "Synthetic approved editorial heading." },
      reason: "Synthetic independent editorial proposal",
    });
    await assert.rejects(
      f.call("manager", "approval.decide", {
        id: req.id,
        decision: "approve",
        reason: "Attempted self approval must fail",
      }),
    );
    await f.call("owner", "approval.decide", {
      id: req.id,
      decision: "approve",
      reason: "Independent owner reviewed editorial text",
    });
    assert.equal(
      (await dispatch("catalogue", null, {}, f.db)).website.heroSubheading,
      "Synthetic approved editorial heading.",
    );
    const p = (await one(
      f.db,
      "SELECT value FROM settings WHERE key='testimonials.policy'",
    ))!.value;
    await assert.rejects(
      f.call("manager", "setting.propose", {
        key: "testimonials.policy",
        scope: "lagos",
        version: 1,
        value: { ...p, moderationRequired: false },
        reason: "Attempt to bypass mandatory moderation",
      }),
    );
    assert.equal(
      (await f.call("owner", "testimonials.analytics")).counts.length,
      0,
    );
    await assert.rejects(f.call("customer", "testimonials.analytics"));
  } finally {
    await f.db.close?.();
  }
});
test("TM-MEDIA-HTTP: upload requires photo consent; public image responses are never cached and withdrawal revokes anonymous reads", async () => {
  const f = await fixture();
  const globals = globalThis as any;
  const previous = {
    db: globals.easygasDb,
    migration: globals.easygasLocalMigration,
    version: globals.easygasLocalVersion,
  };
  try {
    globals.easygasDb = Promise.resolve(f.db);
    globals.easygasLocalVersion = 39;
    globals.easygasLocalMigration = undefined;
    const { NextRequest } = await import("next/server");
    const { POST } = await import("../apps/web/app/api/media/route");
    const { GET } = await import("../apps/web/app/api/media/[id]/route");
    const sharp = (await import("sharp")).default;
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{imagesEnabled}','true'::jsonb) WHERE key='testimonials.policy'",
    );
    const bytes = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#006633" },
    })
      .jpeg()
      .toBuffer();
    const upload = async (consent: boolean) => {
      const fd = new FormData();
      fd.set("testimonialId", r.id);
      fd.set("alt", "Synthetic test photo");
      fd.set(
        "image",
        new File([new Uint8Array(bytes)], "fixture.jpg", {
          type: "image/jpeg",
        }),
      );
      if (consent) fd.set("photoConsent", "on");
      return POST(
        new NextRequest("http://localhost:3004/api/media", {
          method: "POST",
          headers: {
            origin: process.env.APP_URL ?? "http://127.0.0.1:3004",
            authorization: "Bearer " + f.actors.customer.token,
          },
          body: fd,
        }),
      );
    };
    assert.equal((await upload(false)).status, 400);
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{photoFormats}','[\"image/png\"]'::jsonb) WHERE key='testimonials.policy'",
    );
    assert.equal(
      (await upload(true)).status,
      400,
      "A JPEG must be rejected when policy allows PNG only",
    );
    await f.db.query(
      "UPDATE settings SET value=jsonb_set(value,'{photoFormats}','[\"image/jpeg\"]'::jsonb) WHERE key='testimonials.policy'",
    );
    const uploaded = await upload(true);
    assert.equal(uploaded.status, 200, await uploaded.clone().text());
    const saved = await uploaded.json();
    const read = () =>
      GET(new NextRequest("http://127.0.0.1:3004/api/media/" + saved.id), {
        params: Promise.resolve({ id: saved.id }),
      });
    assert.notEqual((await read()).status, 200);
    r = await one(f.db, "SELECT * FROM customer_testimonials WHERE id=$1", [
      r.id,
    ]);
    for (const status of ["PENDING_REVIEW", "APPROVED", "PUBLISHED"])
      r = await f.call(
        status === "PENDING_REVIEW" ? "customer" : "owner",
        "testimonial.transition",
        {
          id: r.id,
          revision: r.revision,
          status,
          ...(status === "PENDING_REVIEW"
            ? {}
            : { reason: "Synthetic image HTTP consent moderation" }),
        },
      );
    const publicImage = await read();
    assert.equal(publicImage.status, 200);
    assert.match(publicImage.headers.get("Cache-Control") ?? "", /no-store/);
    assert.equal(publicImage.headers.get("Content-Type"), "image/webp");
    await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "WITHDRAWN",
    });
    assert.notEqual((await read()).status, 200);
  } finally {
    globals.easygasDb = previous.db;
    globals.easygasLocalMigration = previous.migration;
    globals.easygasLocalVersion = previous.version;
    await f.db.close?.();
  }
});
test("HP-DATA: homepage reads published products with backend prices and active services through a bounded read model", async () => {
  const f = await fixture();
  try {
    const template = (
      await f.db.query(
        "SELECT * FROM products WHERE category<>'Gas refills' LIMIT 1",
      )
    ).rows[0];
    for (let n = 0; n < 15; n++) {
      const pid = id();
      await f.db.query(
        "INSERT INTO products(id,name,description,category,asset,sku) VALUES($1,$2,$3,$4,$5,$1)",
        [
          pid,
          "Synthetic catalogue " + n,
          "Synthetic QA catalogue record",
          template.category,
          template.asset,
        ],
      );
      await f.db.query(
        "INSERT INTO inventory(branch_id,product_id,price_kobo,published,quantity,reserved) VALUES('lagos',$1,1000,$2,2,0)",
        [pid, n % 2 === 0],
      );
    }
    const home = await dispatch("catalogue", null, { view: "homepage" }, f.db);
    assert.ok(home.products.length <= 12);
    assert.ok(home.products.every((r: any) => r.published));
    assert.ok(home.homeServices.length <= 3);
    for (const product of home.products.filter(
      (r: any) => r.category === "Gas refills",
    ))
      assert.equal(
        Number(product.price_kobo),
        Math.round(Number(product.size_kg) * home.gas.priceKobo),
      );
    await f.db.query(
      "UPDATE service_catalogue SET config=jsonb_set(config,'{active}','false'::jsonb)",
    );
    assert.deepEqual(
      (await dispatch("catalogue", null, { view: "homepage" }, f.db))
        .homeServices,
      [],
    );
    await assert.rejects(
      dispatch("catalogue", null, { view: "arbitrary" }, f.db),
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-MANAGEMENT: owner searches and paginates all matches, exports filtered rows, and lower roles are denied", async () => {
  const f = await fixture();
  try {
    for (let n = 0; n < 2; n++)
      await f.call("customer", "testimonial.create", {
        orderId: await purchase(f),
        content: {
          ...feedback,
          rating: n ? 5 : 1,
          body: n
            ? "Synthetic 100% feedback for complete catalogue pagination."
            : feedback.body,
        },
      });
    const first = await f.call("owner", "testimonials.manage", {
        limit: 1,
        page: 0,
      }),
      second = await f.call("owner", "testimonials.manage", {
        limit: 1,
        page: 1,
      });
    assert.equal(first.total, 2);
    assert.equal(first.rows.length, 1);
    assert.notEqual(first.rows[0].id, second.rows[0].id);
    assert.equal(
      (await f.call("owner", "testimonials.manage", { q: "100%", rating: 5 }))
        .total,
      1,
    );
    assert.equal(
      (await f.call("owner", "testimonials.export", { rating: 1 })).rows.length,
      1,
    );
    assert.equal(
      (await f.call("owner", "testimonials.manage", { q: "' OR true --" }))
        .total,
      0,
    );
    await assert.rejects(f.call("commercial", "testimonials.export"));
    await assert.rejects(
      f.call("owner", "testimonials.manage", { limit: 100000 }),
    );
  } finally {
    await f.db.close?.();
  }
});
test("TM-WITHDRAW-STALE: customer consent revocation wins over a stale screen and retries have one effect", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    let r = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    r = await f.call("customer", "testimonial.transition", {
      id: r.id,
      revision: r.revision,
      status: "PENDING_REVIEW",
    });
    const customerRevision = r.revision;
    for (const status of ["APPROVED", "PUBLISHED"])
      r = await f.call("owner", "testimonial.transition", {
        id: r.id,
        revision: r.revision,
        status,
        reason: "Synthetic concurrent moderation advance",
      });
    const request = {
      id: r.id,
      revision: customerRevision,
      status: "WITHDRAWN",
    };
    const withdrawn = await f.call(
      "customer",
      "testimonial.transition",
      request,
    );
    assert.equal(withdrawn.status, "WITHDRAWN");
    const retry = await f.call("customer", "testimonial.transition", request);
    assert.equal(retry.revision, withdrawn.revision);
    assert.equal(
      Number(
        (
          await one(
            f.db,
            "SELECT count(*) AS n FROM testimonial_events WHERE testimonial_id=$1 AND to_status='WITHDRAWN'",
            [r.id],
          )
        )?.n,
      ),
      1,
    );
    assert.deepEqual(await dispatch("testimonials.public", null, {}, f.db), []);
  } finally {
    await f.db.close?.();
  }
});
test("TM-EXPORT: existing identity-verified account export includes only owned testimonial versions and consent history", async () => {
  const f = await fixture();
  try {
    await f.call("customer", "testimonial.create", {
      orderId: await purchase(f),
      content: feedback,
    });
    await assert.rejects(
      f.call("customer", "account.export"),
      /Verify your password/,
    );
    for (const role of ["customer", "commercial"])
      await f.call(role, "reauth", { password: "Services-fixture-only-123!" });
    const own = await f.call("customer", "account.export"),
      other = await f.call("commercial", "account.export");
    assert.equal(own.testimonials.length, 1);
    assert.equal(own.testimonials[0].versions[0].body, feedback.body);
    assert.equal(own.testimonials[0].versions[0].consent, true);
    assert.equal(own.testimonials[0].events.length, 1);
    assert.deepEqual(other.testimonials, []);
    assert.equal(own.testimonials[0].events[0].actor_id, undefined);
  } finally {
    await f.db.close?.();
  }
});
test("TM-ENTRY: completed-transaction links select only an eligible owned transaction and prioritize an existing submission", async () => {
  const f = await fixture();
  try {
    const orderId = await purchase(f);
    const own = await f.call("customer", "testimonials.mine", { orderId }),
      other = await f.call("commercial", "testimonials.mine", { orderId });
    assert.equal(own.selectedTransaction, "order:" + orderId);
    assert.equal(other.selectedTransaction, "");
    const saved = await f.call("customer", "testimonial.create", {
      orderId,
      content: feedback,
    });
    const after = await f.call("customer", "testimonials.mine", { orderId });
    assert.equal(after.submissions[0].id, saved.id);
    assert.equal(after.selectedTransaction, "");
  } finally {
    await f.db.close?.();
  }
});
