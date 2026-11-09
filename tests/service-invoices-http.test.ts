import { localSchemaRevision } from "../apps/web/lib/db";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../apps/web/app/api/[action]/route";
import { GET as download } from "../apps/web/app/api/invoices/[orderId]/route";
import { fixture, begin } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { createDatabase, getDb } from "../apps/web/lib/db";
import { readFile } from "node:fs/promises";

test("SINV-HTTP01: real JSON and private PDF handlers work under restricted runtime and deny foreign/anonymous/technician access", async () => {
  const db = await createDatabase("memory://");
  const globals = globalThis as any,
    previous = globals.easygasDb,
    jobs = process.env.EASYGAS_BACKGROUND_JOBS,
    previousVersion = globals.easygasLocalVersion;
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db);
    const b = await begin(f);
    globals.easygasDb = Promise.resolve(db);
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    globals.easygasLocalVersion = localSchemaRevision; // Bootstrap already migrated; runtime deliberately has no schema-creation privilege.
    await getDb();
    const save = await POST(
      new NextRequest("http://localhost:3003/api/invoice.service.draft.save", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-easygas-client": "native",
          authorization: "Bearer " + f.actors.finance.token,
        },
        body: JSON.stringify({
          bookingId: b.id,
          expectedRevision: 0,
          dueDate: "2026-12-20",
          customerNote: "Synthetic HTTP draft",
          reason: "Restricted runtime draft acceptance",
          operationKey: id(),
        }),
      }),
      { params: Promise.resolve({ action: "invoice.service.draft.save" }) },
    );
    assert.equal(save.status, 200);
    assert.equal((await save.json()).savedRevision.revision, 1);
    const issue = (token?: string) =>
      POST(
        new NextRequest("http://localhost:3003/api/invoice.service.issue", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-easygas-client": "native",
            ...(token ? { authorization: "Bearer " + token } : {}),
          },
          body: JSON.stringify({ bookingId: b.id, expectedDraftRevision: 1 }),
        }),
        { params: Promise.resolve({ action: "invoice.service.issue" }) },
      );
    assert.equal((await issue()).status, 401);
    assert.equal((await issue(f.actors.technician.token)).status, 403);
    assert.equal((await issue(f.actors.finance.token)).status, 200);
    const get = (token?: string) =>
      download(
        new NextRequest(
          `http://localhost:3003/api/invoices/${b.id}?source=service`,
          { headers: token ? { authorization: "Bearer " + token } : {} },
        ),
        { params: Promise.resolve({ orderId: b.id }) },
      );
    assert.equal((await get()).status, 401);
    assert.equal((await get(f.actors.commercial.token)).status, 404);
    assert.equal((await get(f.actors.technician.token)).status, 403);
    const pdf = await get(f.actors.customer.token);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("cache-control")!, /private.*no-store/);
    assert.equal(pdf.headers.get("content-type"), "application/pdf");
    assert.ok((await pdf.arrayBuffer()).byteLength > 1000);
    await assert.rejects(
      () => db.query("UPDATE customer_invoices SET total_kobo=1"),
      /permission denied|immutable/,
    );
    assert.equal(
      (
        await f.call("service_manager", "invoice.corrections", {
          bookingId: b.id,
        })
      ).totalKobo,
      120000,
    );
  } finally {
    globals.easygasDb = previous;
    if (jobs === undefined) delete process.env.EASYGAS_BACKGROUND_JOBS;
    else process.env.EASYGAS_BACKGROUND_JOBS = jobs;
    globals.easygasLocalVersion = previousVersion;
    await db.close?.();
  }
});
