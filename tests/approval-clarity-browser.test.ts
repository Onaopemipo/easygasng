import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("APC-BROWSER: hosted desktop and phone distinguish requester, review and verified owner approval with retained dual-review history", async () => {
  const base = "docs/approval-clarity/evidence/";
  const browser = JSON.parse(
    await readFile(base + "browser-checks.json", "utf8"),
  );
  const stable = JSON.parse(
    await readFile(base + "stable-identity.json", "utf8"),
  );
  const readback = JSON.parse(
    await readFile(base + "hosted-readback.json", "utf8"),
  );
  assert.equal(browser.sourceSha, stable.meta.gitCommitSha);
  assert.equal(stable.readyState, "READY");
  const check = (name: string) => {
    const row = browser.checks.find((c: any) => c.name === name);
    assert.ok(row, name);
    return row;
  };
  for (const name of ["final-desktop-owner-row", "final-phone-owner-row"]) {
    assert.match(check(name).text, /Requested by/);
    assert.match(check(name).text, /Awaiting owner approval · 0\/1/);
    assert.match(check(name).text, /Review$/);
  }
  assert.equal(check("final-desktop-owner-row").requestedByHeader, true);
  for (const name of [
    "final-desktop-owner-dialog",
    "final-phone-owner-dialog",
  ]) {
    const row = check(name);
    assert.match(row.text, /No second Admin is needed/);
    assert.match(row.text, /verifying your identity/);
    assert.ok(
      row.text.indexOf("Awaiting owner approval") <
        row.text.indexOf("CURRENT AT SUBMISSION"),
    );
    assert.equal(row.approveEnabled, true);
  }
  const fit = check("final-phone-owner-dialog").geometry;
  assert.equal(fit.viewportWidth, 390);
  assert.equal(fit.pageWidth, 390);
  assert.ok(fit.dialogWidth <= 390);
  assert.match(
    check("final-desktop-dual-history").text,
    /two distinct authorised reviewers/,
  );
  assert.match(
    check("final-desktop-dual-history").text,
    /Demo owner — approve/,
  );
  assert.match(
    check("final-desktop-dual-history").text,
    /Demo finance — approve/,
  );
  assert.equal(readback.businessUnchanged, true);
  assert.equal(readback.namedRequest.status, "pending_approval");
  assert.equal(readback.namedRequest.decisions, 0);
  assert.equal(readback.namedRequest.can_owner_apply, true);
  assert.equal(readback.dualRequest.progress.required, 2);
  assert.match(browser.method, /No pending dual-review record/);
  for (const file of [
    "final-owner-row-desktop.jpg",
    "final-owner-dialog-desktop.jpg",
    "final-owner-dialog-phone.jpg",
  ])
    assert.ok((await stat(base + file)).size > 1000);
});
