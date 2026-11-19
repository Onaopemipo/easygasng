import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
import { fixture } from "./helpers/service-fixture";
import { one } from "../apps/web/lib/db";
import { id, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
registerHooks({
  load(url, context, next) {
    if (url.endsWith(".module.css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default new Proxy({}, {get:(_,key)=>String(key)})",
      };
    return next(url, context);
  },
});
const { AccountSettingsView, accountSection, Preferences } = await import(
  "../apps/web/components/customer-account"
);
const { PublicTestimonials } = await import(
  "../apps/web/components/testimonials"
);
const sample = {
  user: {
    name: "Synthetic Customer",
    email: "own@example.test",
    verified: true,
    delivery_phone: "08012345678",
    public_customer_id: "EGC-SYNTHETIC",
  },
  addresses: [
    {
      id: "synthetic-private-address",
      label: "Home",
      street: "12 Synthetic Street",
      zone: "Ikoyi",
      phone: "08012345678",
      is_default: true,
      location_available: true,
    },
  ],
  sessions: [
    {
      id: "private-session-token",
      current: true,
      created_at: "2026-11-19T00:00:00Z",
    },
  ],
  privacyRequests: [],
  preferences: {
    marketing: false,
    refill_reminders: true,
    service_reminders: false,
    quiet_start: 21,
    quiet_end: 8,
  },
};
function render(section: any, data = sample) {
  return renderToStaticMarkup(
    React.createElement(AccountSettingsView, { data, section, onOpen() {} }),
  );
}
test("CACC-UI01: profile is the default settings entry with navigation and no open editor or unrelated forms", () => {
  assert.equal(accountSection(new URLSearchParams()), "profile");
  assert.equal(
    accountSection(new URLSearchParams("section=unknown")),
    "profile",
  );
  assert.equal(
    accountSection(new URLSearchParams("section=notifications")),
    "notifications",
  );
  assert.equal(
    accountSection(new URLSearchParams("testimonialOrder=synthetic")),
    "reviews",
  );
  assert.equal(
    accountSection(new URLSearchParams("testimonialBooking=synthetic")),
    "reviews",
  );
  const html = render("profile");
  assert.equal((html.match(/Account &amp; privacy/g) ?? []).length, 1);
  for (const section of [
    "profile",
    "addresses",
    "notifications",
    "security",
    "appearance",
    "reviews",
  ])
    assert.match(html, new RegExp(`section=${section}`));
  assert.match(html, /Personal information|Verified|Edit profile/);
  assert.doesNotMatch(
    html,
    /<form|name="password"|Share an experience|Queue verification email|External email/,
  );
  assert.doesNotMatch(html, /private-session-token|synthetic-private-address/);
});
test("CACC-UI02: addresses and privacy summaries expose focused actions without open forms or secret session identifiers", () => {
  const addresses = render("addresses");
  assert.match(addresses, /12 Synthetic Street/);
  assert.match(addresses, /Default/);
  assert.match(addresses, /Add address/);
  assert.doesNotMatch(
    addresses,
    /Set as default|<form|synthetic-private-address/,
  );
  const unavailable = render("addresses", {
    ...sample,
    addresses: [
      { ...sample.addresses[0], is_default: false, location_available: false },
    ],
  });
  assert.match(unavailable, /currently unavailable/);
  assert.doesNotMatch(unavailable, /Set as default/);
  const security = render("security");
  assert.match(security, /Export personal data/);
  assert.match(security, /do not erase your data/);
  assert.match(security, /This session/);
  assert.doesNotMatch(security, /private-session-token|name="password"|<form/);
  assert.match(
    render("addresses", { ...sample, addresses: [] }),
    /Your next delivery starts here/,
  );
  assert.match(render("appearance"), /Colour theme/);
  assert.doesNotMatch(render("reviews"), /<form/);
});
test("CACC-UI03: communication fields use server contract names, bounded hour choices and independent saved values", () => {
  const html = renderToStaticMarkup(
    React.createElement(Preferences, { preferences: sample.preferences }),
  );
  for (const name of [
    "marketing",
    "refillReminders",
    "serviceReminders",
    "quietStart",
    "quietEnd",
  ])
    assert.match(html, new RegExp(`name="${name}"`));
  assert.match(html, /role="switch"/);
  assert.match(html, /value="21" selected=""/);
  assert.match(html, /value="8" selected=""/);
  assert.doesNotMatch(html, /value="24"/);
  assert.match(html, /Lagos time/);
});
test("CACC-API01: address edits remain owner-scoped and preserve recipient details, default and archive semantics", async () => {
  const f = await fixture();
  try {
    const profile = await f.call("customer", "account.profile"),
      area = profile.deliveryLocations[0];
    const input = {
      label: "Home",
      street: "12 Synthetic Street",
      locationId: area.id,
      phone: "08012345678",
      recipient: "Someone Else",
      building: "12",
      landmark: "Example Park",
      directions: "Side entrance",
      isDefault: true,
    };
    const first = await f.call("customer", "address.save", input);
    await assert.rejects(
      f.call("commercial", "address.save", { ...input, id: first.id }),
      /Address not found/,
    );
    await assert.rejects(
      f.call("commercial", "address.default", { id: first.id }),
      /not found/,
    );
    await f.call("commercial", "address.archive", { id: first.id });
    const own = await f.call("customer", "account.profile");
    assert.equal(own.addresses.length, 1);
    assert.equal(own.addresses[0].is_default, true);
    assert.equal(own.addresses[0].details.recipient, input.recipient);
    await f.call("customer", "address.save", {
      ...input,
      id: first.id,
      label: "Updated home",
    });
    assert.equal(
      (await f.call("customer", "account.profile")).addresses[0].details
        .directions,
      input.directions,
    );
    await f.call("customer", "address.archive", { id: first.id });
    assert.equal(
      (await f.call("customer", "account.profile")).addresses.length,
      0,
    );
    assert.equal(
      (await one(f.db, "SELECT archived FROM account_addresses WHERE id=$1", [
        first.id,
      ]))!.archived,
      true,
    );
    await assert.rejects(
      f.call("customer", "address.save", {
        ...input,
        locationId: "unavailable-area",
      }),
      /active supported/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CACC-API02: preferences and channel purposes persist independently and reject invalid hours or another customer's marketing change", async () => {
  const f = await fixture();
  try {
    const preferences = {
      marketing: false,
      refillReminders: true,
      serviceReminders: false,
      quietStart: 22,
      quietEnd: 7,
    };
    await f.call("customer", "preferences.save", preferences);
    const p = (await f.call("customer", "account.profile")).preferences;
    assert.deepEqual(
      [
        p.marketing,
        p.refill_reminders,
        p.service_reminders,
        p.quiet_start,
        p.quiet_end,
      ],
      [false, true, false, 22, 7],
    );
    await assert.rejects(
      f.call("customer", "preferences.save", {
        ...preferences,
        quietStart: 24,
      }),
    );
    const consent = {
      operationKey: id(),
      channel: "sms",
      purpose: "refill",
      enabled: true,
      evidence: "Customer selected their own SMS refill consent",
    };
    await f.call("customer", "channels.consent", consent);
    await f.call("customer", "channels.consent", consent);
    const sms = (
      await f.call("customer", "channels.preferences")
    ).consents.find((c: any) => c.channel === "sms" && c.purpose === "refill");
    assert.equal(sms.version, 1);
    await f.call("customer", "channels.consent", {
      operationKey: id(),
      channel: "whatsapp",
      purpose: "marketing",
      enabled: false,
      evidence: "Customer declined their own WhatsApp marketing consent",
    });
    const c = (await f.call("customer", "channels.preferences")).consents;
    assert.equal(c.filter((r: any) => r.enabled).length, 1);
    assert.equal(c.find((r: any) => r.enabled).purpose, "refill");
    await assert.rejects(
      f.call("customer", "channels.consent", {
        operationKey: id(),
        customerId: f.actors.commercial.id,
        channel: "sms",
        purpose: "marketing",
        enabled: true,
        evidence: "Cannot change someone else's purpose consent",
      }),
      /permission|own|allowed/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CACC-API03: privacy requires fresh password verification, retains deletion records and cannot revoke another customer's session", async () => {
  const f = await fixture();
  try {
    await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [
      f.actors.customer.id,
    ]);
    await assert.rejects(
      f.call("customer", "account.export", {}),
      /verify your password/i,
    );
    await assert.rejects(
      f.call("customer", "privacy.request", {
        kind: "deletion",
        reason: "Synthetic privacy review",
      }),
      /verify your password/i,
    );
    await assert.rejects(
      f.call("customer", "reauth", { password: "Wrong-fixture-password!" }),
    );
    await f.call("customer", "reauth", {
      password: "Services-fixture-only-123!",
    });
    const request = await f.call("customer", "privacy.request", {
      kind: "deletion",
      reason: "Synthetic privacy review",
    });
    assert.equal(request.status, "retained");
    assert.match(request.message, /not been deleted/);
    const exported = await f.call("customer", "account.export", {});
    assert.equal(exported.profile.id, f.actors.customer.id);
    assert.equal(
      (await f.call("customer", "account.profile")).privacyRequests[0].status,
      "retained",
    );
    const foreign = (
      await f.call("commercial", "account.profile")
    ).sessions.find((s: any) => s.current);
    await f.call("customer", "account.session.revoke", { id: foreign.id });
    assert.ok(await f.call("commercial", "account.profile"));
    const other = await issueSession(f.db, f.actors.customer.id);
    // Session action takes a session digest from the owned profile, never a raw token.
    const profile = await f.call("customer", "account.profile");
    const selected = profile.sessions.find((s: any) => !s.current)!;
    await f.call("customer", "account.session.revoke", { id: selected.id });
    await assert.rejects(
      dispatch("account.profile", other, {}, f.db),
      /expired|sign in/i,
    );
    assert.ok(await f.call("customer", "account.profile"));
  } finally {
    await f.db.close?.();
  }
});

test("CACC-UI04: public review entry opens the dedicated reviews settings section", () => {
  const html = renderToStaticMarkup(React.createElement(PublicTestimonials));
  assert.match(html, /href="\/account-settings\?section=reviews#testimonials"/);
});
