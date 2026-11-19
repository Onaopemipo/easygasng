import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
registerHooks({
  load(url, context, next) {
    if (url.endsWith(".css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default {}",
      };
    return next(url, context);
  },
});
const { recordWindow, RecordPages, WorkspaceDialog, WorkspaceTabs } =
  await import("../apps/web/components/compact-workspace");
const { StaffServiceWorkspace } = await import(
  "../apps/web/components/professional-services"
);
const { FinanceOverview, ReportActivityTables } = await import(
  "../apps/web/components/business-centre"
);
const render = (component: any, props: any) =>
  renderToStaticMarkup(React.createElement(component, props));
const bookings = Array.from({ length: 19 }, (_, n) => ({
  id: `b${n}`,
  reference: `BOOKING-${String(n).padStart(2, "0")}`,
  snapshot: { name: "Cooker maintenance" },
  status: n === 18 ? "awaiting_customer_approval" : "pending_confirmation",
  starts_at: "2030-01-01T09:00:00Z",
  billing: { paidKobo: 12500 },
  address: { street: "PRIVATE STREET", phone: "PRIVATE PHONE" },
  equipment: { concerns: "PRIVATE CONCERN" },
  schedule_pending: true,
}));
const base = {
  mode: "bookings",
  user: { id: "owner", role: "owner" },
  catalogue: [],
  bookings,
  manager: true,
  reload() {},
  revision: 0,
};
test("ACMP-PAGE: record windows retain every loaded record without duplicates or out-of-range blanks", () => {
  const all = Array.from({ length: 25 }, (_, n) => n);
  assert.deepEqual(
    [1, 2, 3, 4].flatMap((p) => recordWindow(all, p).rows),
    all,
  );
  assert.equal(recordWindow(all, 99).current, 4);
  assert.equal(recordWindow(all, -1).current, 1);
  assert.deepEqual(recordWindow([], 8), { rows: [], current: 1, pages: 1 });
  const html = render(RecordPages, {
    rows: all,
    children: (rows: number[]) =>
      React.createElement("span", null, rows.join(",")),
  });
  assert.match(html, /0,1,2,3,4,5,6,7/);
  assert.doesNotMatch(html, /8,9/);
  assert.match(html, /Page 1 of 4/);
});
test("ACMP-BOOK: staff booking list bounds rows and excludes private details and unselected action forms", () => {
  const html = render(StaffServiceWorkspace, base);
  assert.equal((html.match(/<tr>/g) || []).length, 9);
  assert.match(html, /BOOKING-07/);
  assert.doesNotMatch(
    html,
    /BOOKING-08|PRIVATE STREET|PRIVATE PHONE|PRIVATE CONCERN|<form|role="dialog"/,
  );
  assert.match(html, /Preferred time/);
  assert.match(html, /Verified paid/);
});
test("ACMP-QUOTE: quotation scope and explicit empty/search states do not display unrelated bookings", () => {
  const html = render(StaffServiceWorkspace, { ...base, mode: "quotations" });
  assert.match(html, /BOOKING-18/);
  assert.doesNotMatch(html, /BOOKING-00/);
  const empty = render(StaffServiceWorkspace, {
    ...base,
    mode: "quotations",
    bookings: bookings.slice(0, 18),
  });
  assert.match(empty, /No quotations awaiting approval/);
  assert.doesNotMatch(empty, /<table/);
});
test("ACMP-CAT: one catalogue table shows draft state and no public booking card or inline service editor", () => {
  const html = render(StaffServiceWorkspace, {
    ...base,
    mode: "catalogue",
    catalogue: Array.from({ length: 12 }, (_, n) => ({
      id: `s${n}`,
      name: `Service ${n}`,
      version: 2,
      config: { active: false, priceKobo: null, durationMinutes: 60 },
    })),
  });
  assert.equal((html.match(/<tr>/g) || []).length, 9);
  assert.match(html, /Draft/);
  assert.match(html, /Quotation required/);
  assert.doesNotMatch(
    html,
    /<form|View service &amp; book|Business-managed service catalogue/,
  );
});
test("ACMP-FIN: unavailable profits remain distinct from zero and secondary financial details stay out of the overview", () => {
  const html = render(FinanceOverview, {
    data: {
      finance: {
        verifiedCompletedRevenueKobo: 12500,
        grossProfitKobo: null,
        recordedExpensesKobo: 0,
        netProfitKobo: null,
        walletLiabilityKobo: 999999,
      },
      expenses: [],
      analytics: {
        dailyOrderRevenue: [{ date: "2030-01-01", amountKobo: 12500 }],
      },
      completeness: { expenses: true },
    },
  });
  assert.equal((html.match(/Unavailable/g) || []).length, 2);
  assert.match(html, /125\.00/);
  assert.match(html, /No recorded expenses/);
  assert.doesNotMatch(html, /9,999\.99|role="dialog"|<form/);
  assert.match(html, /More financial details/);
});
test("ACMP-DIALOG: secondary workflows do not mount until requested and tabs retain accessible current state", () => {
  const html = render(WorkspaceDialog, {
    title: "Sensitive action",
    children: React.createElement("form", null, "Private form"),
  });
  assert.doesNotMatch(html, /Private form|<form|role="dialog"/);
  const tabs = render(WorkspaceTabs, {
    value: "ledger",
    onChange() {},
    label: "Reconciliation workspace",
    tabs: [
      ["ledger", "Payment ledger"],
      ["docs", "Documents"],
    ],
  });
  assert.match(tabs, /aria-pressed="true"/);
  assert.match(tabs, /aria-label="Reconciliation workspace"/);
});
test("ACMP-REPORT: schedule history retains records with bounded tables and one empty state", () => {
  const html = render(ReportActivityTables, {
    schedules: Array.from({ length: 21 }, (_, n) => ({
      id: `schedule-${n}`,
      report: "sales",
      frequency: "daily",
      active: true,
    })),
    deliveries: [],
  });
  assert.match(html, /schedule-7/);
  assert.doesNotMatch(html, /schedule-8</);
  assert.match(html, /Page 1 of 3/);
  const empty = render(ReportActivityTables, { schedules: [], deliveries: [] });
  assert.equal((empty.match(/No scheduled reports yet/g) || []).length, 1);
});
