import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import AdminNavigation from "../apps/web/components/admin-navigation";
import {
  refreshingNavigationSnapshot,
  failedNavigationSnapshot,
} from "../packages/business-rules/src/admin-navigation";
const snapshot = {
  user: { id: "synthetic-navigation-owner", name: "Demo owner", role: "owner" },
  allowed: ["inventory"],
  counters: { inventory: 4 },
  counterDescriptions: { inventory: "stock alerts" },
  generatedAt: "2026-11-09T00:00:00Z",
};
const render = (access: any) =>
  renderToStaticMarkup(
    React.createElement(
      PathnameContext.Provider,
      { value: "/admin/inventory" },
      React.createElement(AdminNavigation, {
        user: access.user,
        access,
        open: false,
        onClose: () => {},
        onLogout: () => {},
        collapsed: false,
        onCollapsedChange: () => {},
      }),
    ),
  );
test("INV-BADGE-02: actual sidebar renders the same alert during refresh/failure and removes it only for a confirmed zero", () => {
  for (const state of [
    snapshot,
    refreshingNavigationSnapshot(snapshot),
    failedNavigationSnapshot(snapshot),
  ]) {
    const html = render(state);
    assert.match(html, /workspace-nav-badge attention/);
    assert.match(html, />4<\/span>/);
    assert.match(html, /Inventory, 4 stock alerts/);
  }
  const pending = render(refreshingNavigationSnapshot(snapshot));
  assert.match(pending, /Last confirmed count; updating/);
  assert.doesNotMatch(pending, /Updating action counts/);
  const stale = render(failedNavigationSnapshot(snapshot));
  assert.match(stale, /is-stale/);
  assert.match(stale, /Last confirmed counts shown/);
  assert.match(stale, /2026-11-09T00:00:00Z/);
  const revoked = render({
    ...failedNavigationSnapshot(snapshot),
    allowed: [],
  });
  assert.doesNotMatch(revoked, /workspace-nav-badge/);
  const cleared = render({ ...snapshot, counters: { inventory: 0 } });
  assert.doesNotMatch(cleared, /workspace-nav-badge/);
  const unknown = render(
    failedNavigationSnapshot({ ...snapshot, counters: {}, generatedAt: null }),
  );
  assert.doesNotMatch(unknown, /workspace-nav-badge/);
  assert.match(unknown, /Action counts unavailable/);
});
