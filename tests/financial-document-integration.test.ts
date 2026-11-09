import { localSchemaRevision } from "../apps/web/lib/db";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, hashPassword, issueSession, actor } from "../apps/web/lib/auth";
import {
  documentIdentitySchema,
  documentIdentity,
} from "../apps/web/lib/document-identity";
import { GET as documentGET } from "../apps/web/app/api/[action]/route";
import { GET as invoiceGET } from "../apps/web/app/api/invoices/[orderId]/route";
import { one } from "../apps/web/lib/db";
import { financialDocuments } from "../apps/web/lib/financial-documents";

const legal = {
  legalName: "Synthetic verified name",
  address: "Synthetic verified address",
  phone: "+2347011960720",
  email: "",
  website: "",
  registrationNumber: "",
  taxId: "",
  verificationReference: "Synthetic evidence reference",
};
for (const [name, change] of [
  ["email", { email: "support-not-an-email" }],
  ["site", { website: "javascript:alert(1)" }],
  ["site-credentials", { website: "https://user:password@example.test" }],
  ["unverified", { verificationReference: "" }],
  ["script", { legalName: "<script>bad</script>" }],
  ["unknown-key", { taxComplianceGuaranteed: true }],
  ["phone", { phone: "unknown" }],
] as const)
  test(`DOC-IDENTITY-${name}: malformed or unsupported identity cannot activate`, () =>
    assert.equal(
      documentIdentitySchema.safeParse({ ...legal, ...change }).success,
      false,
    ));

test("DOC-IDENTITY-APPROVAL: legal identity requires independent approval and never rewrites issued documents", async () => {
  const f = await fixture(),
    flag = process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
  process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = "true";
  try {
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic finance',$2,$3,'finance','lagos')",
      [uid, uid + "@example.test", hashPassword("Tracking-fixture-only-123!")],
    );
    f.actors.finance = { id: uid, token: await issueSession(f.db, uid) };
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    await f.call("finance", "reauth", {
      password: "Tracking-fixture-only-123!",
    });
    const order = await f.make(),
      issued = await f.call("owner", "invoice.issue", { orderId: order.id }),
      before = JSON.stringify(issued.invoice.snapshot);
    const change = await f.call("owner", "setting.propose", {
      key: "document.identity",
      scope: "lagos",
      version: 1,
      value: legal,
      reason: "Synthetic verified identity for isolated regression",
    });
    await assert.rejects(() =>
      f.call("owner", "approval.decide", {
        id: change.id,
        decision: "approve",
        reason: "Self approval must never activate legal identity",
      }),
    );
    await f.call("finance", "approval.decide", {
      id: change.id,
      decision: "approve",
      reason: "Independent synthetic source evidence review",
    });
    assert.equal((await documentIdentity(f.db, "lagos")).name, legal.legalName);
    assert.equal(
      JSON.stringify(
        (await f.call("owner", "invoice.order", { orderId: order.id })).invoice
          .snapshot,
      ),
      before,
    );
    const order2 = await f.make(),
      next = await f.call("owner", "invoice.issue", { orderId: order2.id });
    assert.equal(next.invoice.snapshot.business.name, legal.legalName);
    assert.equal(next.invoice.snapshot.documentTemplateVersion, 2);
    await assert.rejects(
      () =>
        f.db.query("UPDATE customer_invoices SET snapshot='{}' WHERE id=$1", [
          next.invoice.id,
        ]),
      /immutable/,
    );
  } finally {
    if (flag === undefined) delete process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
    else process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = flag;
    await f.db.close?.();
  }
});

test("DOC-LIBRARY: authenticated HTTP own/scoped documents, filters, source totals, note privacy and no financial side effects", async () => {
  const f = await fixture(),
    g = globalThis as any,
    old = g.easygasDb,
    version = g.easygasLocalVersion,
    flag = process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
  g.easygasDb = Promise.resolve(f.db);
  g.easygasLocalVersion = localSchemaRevision;
  process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = "true";
  try {
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    const o = await f.make(),
      issued = await f.call("owner", "invoice.issue", { orderId: o.id });
    const call = (role?: string, query = "") =>
      documentGET(
        new NextRequest("http://localhost:3003/api/documents.list" + query, {
          headers: role
            ? { authorization: "Bearer " + f.actors[role].token }
            : {},
        }),
        { params: Promise.resolve({ action: "documents.list" }) },
      );
    assert.equal((await call()).status, 401);
    assert.equal((await call("driver")).status, 403);
    assert.equal((await call("commercial")).status, 200);
    assert.equal((await (await call("commercial")).json()).total, 0);
    const own = await call("customer");
    assert.match(own.headers.get("cache-control")!, /no-store/);
    const list = await own.json();
    assert.equal(list.total, 1);
    assert.equal(list.rows[0].model.status, "Unpaid invoice");
    assert.equal(list.rows[0].model.verified, false);
    assert.equal(
      (await (await call("owner", "?status=Unpaid%20invoice")).json()).total,
      1,
    );
    assert.equal(
      (await (await call("owner", "?status=Paid%20invoice")).json()).total,
      0,
    );
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('doc-foreign','Synthetic other document branch')",
    );
    const fid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic branch finance',$2,'unusable','finance','doc-foreign')",
      [fid, fid + "@example.test"],
    );
    f.actors.finance = { id: fid, token: await issueSession(f.db, fid) };
    assert.equal((await (await call("finance")).json()).total, 0);
    assert.equal((await call("finance", "?branchId=lagos")).status, 403);

    assert.equal(list.rows[0].model.number, issued.invoice.invoice_number);
    assert.equal(
      (await (await call("owner", "?type=receipt")).json()).total,
      0,
    );
    assert.equal((await (await call("owner", "?search=%25")).json()).total, 0);
    assert.equal(
      (await (await call("owner", "?page=2")).json()).rows.length,
      0,
    );
    assert.equal(
      (
        await (
          await call("owner", "?search=" + issued.invoice.invoice_number)
        ).json()
      ).total,
      1,
    );
    assert.equal((await call("customer", "?branchId=foreign")).status, 403);
    assert.equal(
      (await call("owner", "?from=2026-12-01&to=2026-01-01")).status,
      400,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM wallet_entries"))!.n),
      0,
    );
    assert.equal(
      Number((await one(f.db, "SELECT count(*) n FROM verified_payments"))!.n),
      0,
    );
    const params = { params: Promise.resolve({ orderId: o.id }) };
    const request = (note: string, role = "customer") =>
      new NextRequest(
        `http://localhost:3003/api/invoices/${o.id}?note=${note}`,
        { headers: { authorization: "Bearer " + f.actors[role].token } },
      );
    assert.equal((await invoiceGET(request(id()), params)).status, 404);
    const note = id();
    await f.db.query(
      "INSERT INTO invoice_notes(id,invoice_id,sequence,kind,amount_kobo,reason,requested_by) VALUES($1,$2,1,'credit',100,'Synthetic pending adjustment',$3)",
      [note, issued.invoice.id, f.actors.owner.id],
    );
    assert.equal((await invoiceGET(request(note), params)).status, 404);
    // An approval result is authorised only through existing note decision path in production.
    await f.db.query(
      "UPDATE invoice_notes SET state='approved',approved_by=$1,decided_at=now() WHERE id=$2",
      [f.actors.dispatcher.id, note],
    );
    const pdf = await invoiceGET(request(note), params);
    assert.equal(pdf.status, 200);
    assert.match(pdf.headers.get("content-disposition")!, /credit-1/);
    assert.equal(
      (await invoiceGET(request(note, "commercial"), params)).status,
      404,
    );
  } finally {
    g.easygasDb = old;
    g.easygasLocalVersion = version;
    if (flag === undefined) delete process.env.EASYGAS_DOCUMENT_TEMPLATE_V2;
    else process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 = flag;
    await f.db.close?.();
  }
});

test("DOC-STATUS-BUDGET: status filtering refuses incomplete page-only counts above its canonical read budget", async () => {
  const f = await fixture();
  try {
    let queries = 0;
    const user = await actor(f.db, f.actors.owner.token);
    const tx: any = {
      query: async (sql: string) => {
        queries++;
        assert.match(sql, /^SELECT count/);
        return { rows: [{ n: 101 }] };
      },
      exec: () => {
        throw new Error("No write allowed");
      },
    };
    await assert.rejects(
      () => financialDocuments(tx, user, { status: "Unpaid invoice" }),
      /Narrow/,
    );
    assert.equal(queries, 1);
  } finally {
    await f.db.close?.();
  }
});
