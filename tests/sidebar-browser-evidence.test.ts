import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("NAVFOCUS-BROWSER: recorded desktop, compact, reload, group, history and mobile observations keep the active link visible", async () => {
  const root = "docs/sidebar-focus/evidence/";
  const { checks } = JSON.parse(
    await readFile(root + "browser-checks.json", "utf8"),
  );
  const check = (label: string) => {
    const result = checks.find((item: any) => item.label === label);
    assert.ok(result, label);
    return result;
  };
  for (const label of [
    "desktop-campaigns",
    "desktop-next-link",
    "desktop-visible-click",
    "desktop-reload-settled",
    "compact-layout",
    "compact-audit",
    "saved-closed-group-route",
    "mobile-reopened-current",
    "mobile-next-route-reopened",
    "mobile-direct-entry",
    "desktop-after-mobile",
    "desktop-browser-back",
  ]) {
    const value = check(label);
    assert.ok(
      value.nav.height > 0 && value.active.bottom > value.active.top,
      label,
    );
    assert.ok(
      value.active.top >= value.nav.top - 1 &&
        value.active.bottom <= value.nav.bottom + 1,
      label,
    );
    assert.ok(value.scrollTop > 0, label);
    assert.equal(value.pageScroll, 0, label);
  }
  assert.equal(
    check("desktop-visible-click").scrollTop,
    check("desktop-next-link").scrollTop,
  );
  assert.equal(
    check("desktop-reload-settled").scrollTop,
    check("desktop-visible-click").scrollTop,
  );
  assert.equal(check("compact-audit").compact, true);
  assert.equal(check("compact-layout").focus, "Expand sidebar");
  assert.equal(check("mobile-direct-entry").open, true);
  assert.equal(check("mobile-escape-final").closed, true);
  assert.equal(check("mobile-escape-final").mainInert, false);
  assert.equal(check("mobile-escape-final").focus, "Toggle business menu");
  for (const image of ["desktop.jpg", "mobile.jpg"])
    assert.ok((await stat(root + image)).size > 10000);
});
