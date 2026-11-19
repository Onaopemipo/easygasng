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
const {
  CampaignRecords,
  RecommendationRecords,
  TestimonialRecords,
  testimonialStatuses,
} = await import("../apps/web/components/engagement-records");
const { RecommendationWorkspace } = await import(
  "../apps/web/components/recommendations"
);
const render = (component: any, props: any) =>
  renderToStaticMarkup(React.createElement(component, props));
test("GROW-CAMPAIGN: summary list is bounded, retains real delivery counts and keeps message/review forms out of the default view", () => {
  const rows = Array.from({ length: 13 }, (_, n) => ({
    id: `c${n}`,
    title: `Campaign ${n}`,
    status: "draft",
    branch_id: "lagos",
    recipients: 12,
    sent: 0,
    body: "PRIVATE FULL CAMPAIGN MESSAGE",
    returning_customers_30d: 9,
  }));
  const html = render(CampaignRecords, { rows, open() {} });
  assert.equal((html.match(/<tr>/g) || []).length, 9);
  assert.match(html, /Campaign 7/);
  assert.doesNotMatch(
    html,
    /Campaign 8<|PRIVATE FULL CAMPAIGN MESSAGE|<form|returning_customers/,
  );
  assert.match(html, /Page 1 of 2/);
  assert.match(
    render(CampaignRecords, { rows: [], open() {} }),
    /No campaigns found/,
  );
});
test("GROW-RULE: compact rule list distinguishes incompatible and unreviewed rules without mounting approval forms or evidence", () => {
  const rows = Array.from({ length: 11 }, (_, n) => ({
    id: `r${n}`,
    product: `Product ${n}`,
    service: "Assessment",
    relation: "incompatible",
    active: false,
    reviewed_by: null,
    completed: 0,
    evidence: "PRIVATE RULE EVIDENCE",
  }));
  const html = render(RecommendationRecords, { rows, open() {} });
  assert.equal((html.match(/<tr>/g) || []).length, 9);
  assert.match(html, /Do not recommend/);
  assert.match(html, /Awaiting review/);
  assert.doesNotMatch(html, /PRIVATE RULE EVIDENCE|<form/);
  const page = render(RecommendationWorkspace, {
    rows,
    products: [],
    services: [],
    user: { id: "owner", role: "owner" },
    reload() {},
  });
  assert.match(page, /Propose rule/);
  assert.doesNotMatch(page, /<form|role="dialog"|Recorded events in/);
});
test("GROW-FEEDBACK: primary rows retain rating, consent and selection while keeping long feedback and moderation/history in the review flow", () => {
  const row = {
    id: "t1",
    display_name: "Synthetic reviewer",
    rating: 1,
    status: "PENDING_REVIEW",
    consent: false,
    body: "A".repeat(130) + "PRIVATE FEEDBACK TAIL",
    current_version: 9,
    revision: 5,
  };
  const html = render(TestimonialRecords, {
    rows: [row],
    selected: [row],
    select() {},
    open() {},
  });
  assert.match(html, /1\/5/);
  assert.match(html, /Not granted/);
  assert.match(html, /checked=""/);
  assert.match(html, /Review feedback/);
  assert.doesNotMatch(
    html,
    /PRIVATE FEEDBACK TAIL|Confirm published|<form|Revision 5/,
  );
  assert.equal(Object.keys(testimonialStatuses).length, 8);
  assert.match(
    render(TestimonialRecords, {
      rows: [],
      selected: [],
      select() {},
      open() {},
    }),
    /No matching testimonials/,
  );
});
