import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("ANALYTICS-BROWSER: hosted consent, actual container execution, private/query/session exclusion, withdrawal and phone clearance are recorded without claiming GA4 receipt", async () => {
  const base = "docs/analytics/evidence/";
  const evidence = JSON.parse(
    await readFile(base + "browser-checks.json", "utf8"),
  );
  const identity = JSON.parse(
    await readFile(base + "stable-identity.json", "utf8"),
  );
  assert.equal(evidence.sourceSha, identity.meta.gitCommitSha);
  assert.equal(identity.readyState, "READY");
  assert.match(
    evidence.method,
    /no collection network or GA4 account reports available/,
  );
  const byName = (name: string) => {
    const row = evidence.checks.find((c: any) => c.name === name);
    assert.ok(row, name);
    return row;
  };
  for (const name of [
    "hosted-before-consent",
    "hosted-essential-only",
    "hosted-admin-excluded",
    "hosted-signed-in-public-excluded",
    "hosted-private-boundary",
    "hosted-private-document-stays-untracked",
    "hosted-query-excluded",
    "hosted-withdrawn",
    "hosted-final-phone-withdrawn",
  ])
    assert.deepEqual(byName(name).googleScripts, [], name);
  assert.equal(byName("hosted-before-consent").banner, true);
  assert.equal(byName("hosted-essential-only").banner, false);
  assert.equal(byName("hosted-query-excluded").queryPresent, true);
  const allowed = byName("hosted-final-phone-allowed");
  assert.deepEqual(allowed.googleScripts, [
    { path: "/gtm.js", tag: "GTM-KLJ8FM96" },
  ]);
  assert.equal(
    byName("hosted-final-container-executed").containerStatus,
    "loaded",
  );
  assert.equal(
    byName("hosted-final-container-executed").containerId,
    "GTM-KLJ8FM96",
  );
  const phone = byName("hosted-phone-preferences-fixed");
  assert.equal(phone.url, "/");
  assert.equal(phone.banner, true);
  assert.equal(phone.viewportWidth, 390);
  assert.equal(phone.pageWidth, 390);
  assert.equal(byName("hosted-final-desktop-preferences").banner, true);
  for (const file of ["consent-final-desktop.jpg", "consent-phone.jpg"])
    assert.ok((await stat(base + file)).size > 1000);
  const published = JSON.parse(
    await readFile(base + "published-container.json", "utf8"),
  );
  assert.equal(published.httpStatus, 200);
  assert.deepEqual(published.destinations, ["G-8Y34NXQMMK"]);
});
