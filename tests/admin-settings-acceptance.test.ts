import test from "node:test";
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { settingsFixture } from "./helpers/settings-acceptance-fixture";
import { one } from "../apps/web/lib/db";
import {
  accountRoles,
  consolidatedRole,
} from "../packages/business-rules/src/staff-roles";
import {
  settingsCategories,
  settingsGroups,
  settingsDisplay,
  settingsApprovalBadge,
} from "../packages/business-rules/src/settings-categories";
import { settingRestorationResult } from "../packages/business-rules/src/setting-editor";
import SettingForm from "../apps/web/components/setting-change-form";
import SettingSummary from "../apps/web/components/setting-summary";
import SettingVersionHistory from "../apps/web/components/setting-version-history";

// Standalone tsx render harness uses classic JSX for existing untransformed components.
(globalThis as any).React = React;
async function enabled(fn: () => Promise<void>) {
  const previous = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  try {
    await fn();
  } finally {
    previous === undefined
      ? delete process.env.EASYGAS_OWNER_AUTO_APPROVAL
      : (process.env.EASYGAS_OWNER_AUTO_APPROVAL = previous);
  }
}
test("ASACC-ROLES: all seven canonical roles, every definition, history/proposal permissions and legacy aliases are authoritative", () =>
  enabled(async () => {
    const f = await settingsFixture();
    try {
      const evidence: any[] = [];
      const before = (
        await f.db.query(
          "SELECT key,scope,value,version FROM settings ORDER BY key,scope",
        )
      ).rows;
      for (const role of accountRoles) {
        const allowed = ["owner", "manager", "finance"].includes(role);
        let rows: any[] = [];
        if (allowed) {
          rows = await f.call(role, "settings", { scope: "lagos" });
          assert.deepEqual(
            rows.map((d) => d.key).sort(),
            f.rows
              .filter((d) => d.view_roles.includes(role))
              .map((d) => d.key)
              .sort(),
          );
          const grouped = settingsCategories(rows).flatMap((c) =>
            settingsGroups(rows, c, "").flatMap((g) => g.settings),
          );
          assert.equal(new Set(grouped.map((d) => d.key)).size, rows.length);
          for (const d of rows) {
            for (const q of [
              d.key,
              d.label,
              d.category,
              settingsDisplay(d).label,
            ])
              assert.ok(
                settingsGroups(rows, "any", q).some((g) =>
                  g.settings.some((s) => s.key === d.key),
                ),
              );
            assert.ok(settingsApprovalBadge(d, role).label);
          }
        } else
          await assert.rejects(() =>
            f.call(role, "settings", { scope: "lagos" }),
          );
        let histories = 0,
          drafts = 0,
          denials = 0;
        for (const d of f.rows) {
          if (d.view_roles.includes(role)) {
            assert.deepEqual(
              await f.call(role, "setting.history", {
                key: d.key,
                scope: "lagos",
              }),
              [],
            );
            histories++;
          } else {
            await assert.rejects(() =>
              f.call(role, "setting.history", { key: d.key, scope: "lagos" }),
            );
            denials++;
          }
          if (d.propose_roles.includes(role)) {
            const result = await f.call(role, "setting.propose", f.input(d));
            assert.equal(result.status, "draft", role + " " + d.key);
            drafts++;
          } else {
            await assert.rejects(() =>
              f.call(role, "setting.propose", f.input(d)),
            );
            denials++;
          }
        }
        evidence.push({
          role,
          visible: rows.length,
          categories: settingsCategories(rows),
          historyChecks: histories,
          drafts,
          denials,
        });
      }
      assert.deepEqual(
        (
          await f.db.query(
            "SELECT key,scope,value,version FROM settings ORDER BY key,scope",
          )
        ).rows,
        before,
      );
      for (const [alias, canonical] of [
        ["administrator", "owner"],
        ["safety_officer", "owner"],
        ["inventory", "finance"],
        ["auditor", "finance"],
        ["sales", "manager"],
        ["sales_rep", "manager"],
        ["dispatcher", "manager"],
        ["service_manager", "manager"],
      ])
        assert.equal(consolidatedRole(alias), canonical);
      await writeFile(
        "docs/admin-settings-acceptance/evidence/role-coverage.json",
        JSON.stringify(
          {
            roles: evidence,
            definitions: f.rows.length,
            allCurrentValuesAndVersionsUnchanged: true,
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      await f.db.close();
    }
  }));
test("ASACC-EDITORS: every existing definition renders with typed valid data; malformed values are rejected by real proposals", () =>
  enabled(async () => {
    const f = await settingsFixture();
    try {
      const types = new Set<string>();
      let rendered = 0,
        invalid = 0;
      for (const d of f.rows) {
        const display = { ...settingsDisplay(d), value: f.value(d) };
        const summary = renderToStaticMarkup(
          React.createElement(SettingSummary, {
            value: display.value,
            type: d.value_type,
          }),
        );
        assert.doesNotMatch(summary, /\[object Object\]/, d.key);
        if (d.propose_roles.includes("owner")) {
          const html = renderToStaticMarkup(
            React.createElement(SettingForm, {
              setting: display,
              userId: f.actors.owner.id,
              onDone() {},
            }),
          );
          assert.ok(html.includes("Review change"), d.key);
          assert.ok(html.includes("Save draft"), d.key);
          assert.doesNotMatch(html, /\[object Object\]/, d.key);
          types.add(d.value_type);
          rendered++;
          await assert.rejects(
            () =>
              f.call("owner", "setting.propose", f.input(d, { value: null })),
            undefined,
            d.key,
          );
          invalid++;
        }
      }
      await writeFile(
        "docs/admin-settings-acceptance/evidence/editor-coverage.json",
        JSON.stringify(
          {
            rendered,
            invalidProposalsRejected: invalid,
            types: [...types].sort(),
            lockedDefinitions: f.rows
              .filter((d) => !d.propose_roles.length)
              .map((d) => d.key),
          },
          null,
          2,
        ) + "\n",
      );
    } finally {
      await f.db.close();
    }
  }));
test("ASACC-LIFECYCLE: manager draft, independent approval, owner versioned restoration, scheduling and stale conflict preserve history", () =>
  enabled(async () => {
    const f = await settingsFixture();
    try {
      for (const role of ["owner", "manager", "finance"])
        await f.call(role, "reauth", { password: f.password });
      const d = f.rows.find((d) => d.key === "delivery.capacity")!;
      const draft = await f.call(
        "manager",
        "setting.propose",
        f.input(d, { value: 61 }),
      );
      assert.equal(draft.status, "draft");
      assert.equal((await f.current(d.key))!.value, 50);
      const submitted = await f.call("manager", "approval.submit", {
        id: draft.id,
        reason: "Submit synthetic capacity review",
      });
      assert.equal(submitted.status, "pending_approval");
      await assert.rejects(() =>
        f.call("manager", "approval.decide", {
          id: draft.id,
          decision: "approve",
          reason: "Cannot approve own request",
        }),
      );
      assert.equal(
        (
          await f.call("owner", "approval.decide", {
            id: draft.id,
            decision: "approve",
            reason: "Independent synthetic review",
          })
        ).status,
        "active",
      );
      assert.equal((await f.current(d.key))!.value, 61);
      const versions = await f.call("manager", "setting.history", {
        key: d.key,
        scope: "lagos",
      });
      assert.equal(versions.length, 1);
      const restored = await f.call("owner", "setting.rollback", {
        versionId: versions[0].id,
        reason: "Synthetic restore to previous capacity",
      });
      assert.equal(restored.status, "active");
      assert.equal((await f.current(d.key))!.value, 50);
      assert.equal((await f.current(d.key))!.version, 3);
      assert.equal(
        (
          await f.call("owner", "setting.history", {
            key: d.key,
            scope: "lagos",
          })
        ).length,
        2,
      );
      await assert.rejects(
        () => f.call("manager", "setting.propose", f.input(d)),
        { code: "VERSION_CONFLICT" },
      );
      const scheduled = await f.call(
        "owner",
        "setting.propose",
        f.input(d, {
          draft: false,
          version: 3,
          value: 62,
          effectiveAt: new Date(Date.now() + 2 * 86400000).toISOString(),
        }),
      );
      assert.equal(scheduled.status, "scheduled");
      assert.equal((await f.current(d.key))!.value, 50);
    } finally {
      await f.db.close();
    }
  }));
test("ASACC-EXCEPTIONS: anonymous, inactive/expired/revoked sessions, branch forgery, stale/invalid values, history leaks and readonly restoration are denied", () =>
  enabled(async () => {
    const f = await settingsFixture();
    try {
      const d = f.rows.find((d) => d.key === "delivery.fee")!;
      for (const role of [
        "anonymous",
        "inactive",
        "commercial",
        "driver",
        "technician",
      ]) {
        await assert.rejects(() =>
          f.call(role, "settings", { scope: "lagos" }),
        );
        await assert.rejects(() => f.call(role, "setting.propose", f.input(d)));
      }
      for (const role of ["manager", "finance", "other"]) {
        const scope = role === "other" ? "lagos" : "qa-other";
        await assert.rejects(() => f.call(role, "settings", { scope }));
        await assert.rejects(() =>
          f.call(role, "setting.history", { key: d.key, scope }),
        );
        await assert.rejects(() =>
          f.call(role, "setting.propose", f.input(d, { scope })),
        );
      }
      for (const extra of [
        { risk: 1 },
        { category: "Routine" },
        { autoApproved: true },
        { scope: "lagos", version: 999 },
        { reason: "x" },
        { effectiveAt: new Date(Date.now() + 8 * 86400000).toISOString() },
      ])
        await assert.rejects(() =>
          f.call("owner", "setting.propose", f.input(d, extra)),
        );
      for (const key of ["business.hours", "delivery.windows"]) {
        const s = f.rows.find((d) => d.key === key)!;
        for (const value of ["25:00–26:00", "18:00–09:00", "09:00–09:00"])
          await assert.rejects(() =>
            f.call("owner", "setting.propose", f.input(s, { value })),
          );
      }
      await assert.rejects(() =>
        f.call("finance", "setting.history", {
          key: "legal.cancellation",
          scope: "lagos",
        }),
      );
      const locked = f.rows.find((d) => d.key === "security.policy")!;
      await assert.rejects(() =>
        f.call("owner", "setting.propose", f.input(locked)),
      );
      const identity = f.rows.find((d) => d.key === "document.identity")!;
      await f.call("owner", "reauth", { password: f.password });
      const saved = await f.call(
        "owner",
        "setting.propose",
        f.input(identity, { draft: false }),
      );
      assert.equal(saved.status, "active");
      const version = (
        await f.call("finance", "setting.history", {
          key: identity.key,
          scope: "lagos",
        })
      )[0];
      await assert.rejects(() =>
        f.call("finance", "setting.rollback", {
          versionId: version.id,
          reason: "View only cannot restore identity",
        }),
      );
      await f.db.query(
        "UPDATE sessions SET revoked_at=now() WHERE user_id=$1",
        [f.actors.manager.id],
      );
      await assert.rejects(() =>
        f.call("manager", "settings", { scope: "lagos" }),
      );
      await f.db.query(
        "UPDATE sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1",
        [f.actors.finance.id],
      );
      await assert.rejects(() =>
        f.call("finance", "settings", { scope: "lagos" }),
      );
      await f.db.query("UPDATE users SET role='driver' WHERE id=$1", [
        f.actors.owner.id,
      ]);
      await assert.rejects(() =>
        f.call("owner", "settings", { scope: "lagos" }),
      );
    } finally {
      await f.db.close();
    }
  }));
test("ASACC-HISTORY: view-only/locked histories expose no restoration; busy, failure and server result states remain explicit", () => {
  const setting = { value_type: "money", propose_roles: ["owner"] };
  const versions = [
    {
      id: "v1",
      version: 2,
      value: 12000,
      previous_value: 10000,
      created_at: "2026-11-20T00:00:00Z",
    },
  ];
  const render = (role: string, busy = false, error = "") =>
    renderToStaticMarkup(
      React.createElement(SettingVersionHistory, {
        setting,
        versions,
        role,
        busy,
        error,
        onRestore() {},
      }),
    );
  assert.ok(render("owner").includes("Request restoration"));
  assert.ok(render("owner", true).includes('disabled=""'));
  assert.ok(
    render("owner", false, "Synthetic conflict").includes('role="alert"'),
  );
  for (const role of [
    "finance",
    "manager",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    assert.doesNotMatch(render(role), /<button/);
    assert.ok(render(role).includes("cannot request restoration"));
  }
  for (const status of ["failed", "superseded", "unknown"]) {
    assert.ok(settingRestorationResult({ status }).error);
    assert.equal(settingRestorationResult({ status }).message, "");
  }
  for (const status of [
    "active",
    "pending_approval",
    "partially_approved",
    "scheduled",
  ]) {
    assert.equal(settingRestorationResult({ status }).error, "");
    assert.ok(settingRestorationResult({ status }).message);
  }
  assert.equal(
    settingRestorationResult({
      status: "failed",
      failure_reason: "Current version changed",
    }).error,
    "Current version changed",
  );
});

test("ASACC-CONTENT: malformed service activation, unsafe checklists and incomplete publication remain blocked; valid typed drafts cannot publish or activate", () =>
  enabled(async () => {
    const f = await settingsFixture();
    try {
      for (const key of [
        "service.cooker-installation",
        "checklist.cooker-installation",
        "legal.cancellation",
      ]) {
        const d = f.rows.find((d) => d.key === key)!;
        const good = f.value(d);
        const invalid =
          d.value_type === "service"
            ? [
                { ...good, active: true, zones: [] },
                {
                  ...good,
                  active: true,
                  zones: ["Synthetic QA"],
                  pricingModel: "fixed",
                  priceKobo: null,
                },
                { ...good, calloutKobo: 1.5 },
              ]
            : d.value_type === "checklist"
              ? [
                  [],
                  [
                    {
                      id: "same",
                      label: "Synthetic check one",
                      required: true,
                    },
                    {
                      id: "same",
                      label: "Synthetic check two",
                      required: true,
                    },
                  ],
                  [
                    {
                      id: "inspection",
                      label: "Synthetic optional inspection",
                      required: false,
                    },
                  ],
                ]
              : [
                  {
                    ...good,
                    published: true,
                    content: "Too short",
                    effectiveAt: new Date().toISOString(),
                  },
                  {
                    ...good,
                    published: true,
                    content: "Synthetic QA only ".repeat(10),
                    effectiveAt: null,
                  },
                ];
        for (const value of invalid)
          await assert.rejects(
            () => f.call("owner", "setting.propose", f.input(d, { value })),
            undefined,
            key,
          );
        const saved = await f.call("owner", "setting.propose", f.input(d));
        assert.equal(saved.status, "draft");
        assert.equal((await f.current(key))!.version, d.version);
        assert.deepEqual((await f.current(key))!.value, d.value);
      }
    } finally {
      await f.db.close();
    }
  }));
