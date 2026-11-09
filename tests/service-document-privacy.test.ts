import test from "node:test";
import assert from "node:assert/strict";
import { serviceDocument } from "../packages/business-rules/src/service-document";
import { serviceReportHtml } from "../packages/business-rules/src/service-report";
test("SVC-DOC01: customer report strips internal acquisition costs without rewriting canonical evidence or quoted prices", () => {
  const original = {
    outcome: "unable",
    findings: "Unsafe <script>fixture</script>",
    materials: [
      {
        product_id: "hose",
        used: 2,
        unit_cost_kobo: 12345,
        unitCostKobo: 12345,
        unit_price_kobo: 50000,
      },
    ],
    invoiceTotalKobo: 100000,
  };
  const customer = serviceDocument(original);
  assert.equal(customer.materials[0].unit_cost_kobo, undefined);
  assert.equal(customer.materials[0].unitCostKobo, undefined);
  assert.equal(customer.materials[0].unit_price_kobo, 50000);
  assert.equal(original.materials[0].unit_cost_kobo, 12345);
  const html = serviceReportHtml(customer);
  assert.match(html, /Documented ceiling for financial review/);
  assert.match(html, /does not create a collectible debt/);
  assert.doesNotMatch(html, /<script>|12345|Approved final invoice/);
  assert.match(html, /&lt;script&gt;/);
});
