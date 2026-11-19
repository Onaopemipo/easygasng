import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CashCollectionTable } from "../apps/web/components/cash-reconciliation";

test("ROLEACC-CASH-UI: actual cash table exposes pending independent review, blocks collector self-review and keeps verified rows read-only", () => {
  const rows = [
    {
      id: "private-pending",
      reference: "QA-PENDING",
      collector_id: "other",
      collector: "Collector",
      amount_kobo: "5700000",
    },
    {
      id: "private-own",
      reference: "QA-OWN",
      collector_id: "reviewer",
      collector: "Reviewer",
      amount_kobo: "10000",
    },
    {
      id: "private-done",
      reference: "QA-VERIFIED",
      collector_id: "other",
      collector: "Collector",
      amount_kobo: "50000",
      verified_at: "2026-11-19T00:00:00Z",
    },
  ];
  const html = renderToStaticMarkup(
    React.createElement(CashCollectionTable, {
      rows,
      userId: "reviewer",
      onReview() {},
    }),
  );
  assert.equal((html.match(/Review cash receipt/g) ?? []).length, 1);
  assert.match(html, /Another finance reviewer required/);
  assert.match(html, /₦57,000/);
  assert.doesNotMatch(html, /private-pending|private-own|private-done/);
  const unknown = renderToStaticMarkup(
    React.createElement(CashCollectionTable, {
      rows: [rows[0]],
      onReview() {},
    }),
  );
  assert.match(unknown, /disabled=""/);
});
