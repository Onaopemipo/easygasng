import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("ANALYTICS-REALTIME: actual Google report evidence confirms the supplied stream and fresh demo page receipt before closing the gate", async () => {
  const base = "docs/analytics/evidence/";
  const record = JSON.parse(
    await readFile(base + "ga4-realtime-confirmation.json", "utf8"),
  );
  const [stream, before, received, pages] = await Promise.all(
    [
      "ga4-stream-confirmed.txt",
      "ga4-realtime-before.txt",
      "ga4-realtime-receipt.txt",
      "ga4-realtime-pages-confirmed.txt",
    ].map((file) => readFile(base + file, "utf8")),
  );
  assert.equal(record.stream.measurementId, "G-8Y34NXQMMK");
  assert.equal(record.stream.containerId, "GTM-KLJ8FM96");
  assert.equal(record.property.id, "565150618");
  assert.match(stream, /G-8Y34NXQMMK/);
  assert.match(stream, /16373512765/);
  assert.match(stream, /generic: EasyGasNg/);
  assert.match(before, /row "EasyGas public website 8"/);
  assert.match(received, /row "EasyGas public website 10"/);
  assert.match(received, /generic: page_location/);
  assert.match(
    received,
    /row "https:\/\/easygas-client-demo\.vercel\.app\/privacy 1"/,
  );
  assert.match(pages, /row "2 \/privacy 1 1"/);
  assert.ok(
    record.received.pageViews30Minutes > record.baseline.pageViews30Minutes,
  );
  assert.ok(Date.parse(record.checkedAt) > Date.parse(record.visitStartedAt));
  assert.equal(record.result, "PASS");
  assert.equal(record.gate, "ANALYTICS-G04");
  assert.equal(record.restoredPreference, "denied");
  assert.equal(record.googleScriptsAfterWithdrawal, 0);
  assert.match(record.method, /No manual collection requests/);
  for (const file of record.artifacts)
    assert.ok((await stat(base + file)).size > 100);
});
