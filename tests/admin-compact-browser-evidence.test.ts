import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
const directory = "docs/admin-compact/evidence";
const evidence = JSON.parse(
  await readFile(`${directory}/browser-checks.json`, "utf8"),
);
for (const [index, route] of [
  "support",
  "bookings",
  "services",
  "quotations",
  "finance",
  "reconciliation",
  "credits",
  "reports",
].entries()) {
  test(`ACMP-UI${String(index + 1).padStart(2, "0")}: ${route} desktop and phone layouts fit with bounded content and no default dialog`, async () => {
    const rows = evidence.checks.filter((r: any) => r.route === route);
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.equal(row.width, row.label === "desktop" ? 1440 : 390);
      assert.equal(row.pageWidth, row.width);
      assert.equal(row.dialogs, 0);
      assert.ok(row.heading);
      assert.ok(row.workspaceHeight > 0);
      assert.ok(row.workspaceHeight <= (row.label === "desktop" ? 1000 : 1266));
      assert.ok(row.rows <= 8);
      await access(`${directory}/${route}-${row.label}.jpg`);
      await access(`${directory}/${route}-${row.label}.ax.txt`);
      if (route === "support")
        assert.ok(row.inboxHeight <= (row.label === "desktop" ? 570 : 480));
    }
  });
}
test("ACMP-INTERACT: recorded browser checks cover canonical lookup, draft guards, focus, document pages and full CSV export", async () => {
  for (const name of [
    "booking-dialog",
    "credit-customer-selection",
    "expense-draft",
    "service-draft",
    "support-reply",
    "report-export",
    "report-schedule",
    "document-pagination",
    "report-filters",
  ])
    assert.match(
      evidence.interactions.find((x: any) => x.name === name)?.result ?? "",
      /^PASS:/,
    );
  const csv = await readFile(`${directory}/report-export.csv`, "utf8");
  assert.equal(csv.trim().split(/\r?\n/).length, 11);
});
