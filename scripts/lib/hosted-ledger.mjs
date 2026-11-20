import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const columns = [
  "id",
  "reference",
  "amount_kobo",
  "method",
  "created_at",
  "order_reference",
  "booking_reference",
  "branch_id",
];
export function ledgerPath(limit = 100, after) {
  assert.ok(
    Number.isInteger(limit) && limit >= 1 && limit <= 500,
    "Ledger limit must be an integer from 1 to 500",
  );
  const q = new URLSearchParams({ limit: String(limit) });
  if (after) q.set("after", after);
  return "finance.ledger?" + q;
}
export function ledgerFingerprint(rows) {
  return createHash("sha256")
    .update(
      JSON.stringify(
        rows.map((r) => Object.fromEntries(columns.map((k) => [k, r[k]]))),
      ),
    )
    .digest("hex");
}
/** request(path) returns {status,body,cacheControl}; never returns credentials. */
export async function readVerifiedLedger(
  request,
  { limit = 100, maxPages = 1000 } = {},
) {
  const rows = [],
    pages = [],
    seen = new Set(),
    cursors = new Set();
  let after;
  for (let page = 0; page < maxPages; page++) {
    const response = await request(ledgerPath(limit, after));
    assert.equal(response.status, 200, "Ledger page must succeed");
    assert.match(
      response.cacheControl ?? "",
      /no-store/i,
      "Financial reads must not be cached",
    );
    const data = response.body;
    assert.ok(Array.isArray(data.rows), "Ledger rows must be an array");
    assert.equal(typeof data.hasMore, "boolean");
    assert.ok(
      data.rows.length <= limit,
      "Ledger page exceeded requested bound",
    );
    for (const row of data.rows) {
      assert.deepEqual(
        Object.keys(row).sort(),
        [...columns].sort(),
        "Ledger exposes only its selected reporting fields",
      );
      assert.equal(typeof row.id, "string");
      assert.match(
        String(row.amount_kobo),
        /^-?\d+$/,
        "Ledger amount must remain integer minor units",
      );
      assert.ok(
        Number.isFinite(Date.parse(row.created_at)),
        "Ledger timestamp invalid",
      );
      assert.ok(!seen.has(row.id), "Ledger repeated a payment across pages");
      const last = rows.at(-1);
      if (last) {
        assert.ok(
          Date.parse(row.created_at) >= Date.parse(last.created_at),
          "Ledger chronological order changed",
        );
        if (row.created_at === last.created_at)
          assert.ok(row.id > last.id, "Ledger tie ordering changed");
      }
      seen.add(row.id);
      rows.push(row);
    }
    pages.push({
      page: page + 1,
      status: response.status,
      rows: data.rows.length,
      hasMore: data.hasMore,
      noStore: true,
    });
    if (!data.hasMore) {
      assert.equal(data.nextCursor, null);
      return {
        rows,
        pages,
        count: rows.length,
        sha256: ledgerFingerprint(rows),
      };
    }
    assert.ok(data.rows.length > 0, "More pages cannot follow an empty page");
    assert.equal(
      data.nextCursor,
      data.rows.at(-1).id,
      "Cursor must identify the last returned payment",
    );
    assert.ok(!cursors.has(data.nextCursor), "Ledger cursor did not advance");
    cursors.add(data.nextCursor);
    after = data.nextCursor;
  }
  throw Error(
    "Ledger pagination did not complete within the bounded acceptance run",
  );
}
