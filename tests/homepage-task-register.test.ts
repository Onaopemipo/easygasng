import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import {
  runnableTasks,
  type RegisteredTask,
} from "../packages/business-rules/src/task-register";
import {
  themePreference,
  resolvedTheme,
  themeBootstrap,
} from "../packages/business-rules/src/theme";
const task = (
  id: string,
  dependsOn: string[] = [],
  blockerIds: string[] = [],
  status: RegisteredTask["status"] = "TODO",
): RegisteredTask => ({ id, dependsOn, blockerIds, status });
test("BLK-01: independent tasks continue while a feature is blocked", () => {
  assert.deepEqual(
    runnableTasks(
      [
        task("core", [], [], "DONE"),
        task("reviews", ["core"], ["consent"]),
        task("theme", ["core"]),
        task("carousel", ["reviews"]),
      ],
      ["consent"],
    ),
    ["theme"],
  );
});
test("BLK-02: resolving a blocker enables only dependency-ready work", () => {
  const tasks = [
    task("schema", [], [], "DONE"),
    task("review", ["schema"], ["database"]),
    task("publish", ["review"]),
  ];
  assert.deepEqual(runnableTasks(tasks, []), ["review"]);
});
test("BLK-03: invalid graphs fail instead of silently skipping tasks", () => {
  assert.throws(() => runnableTasks([task("a", ["missing"])], []), /Unknown/);
  assert.throws(
    () => runnableTasks([task("a", ["b"]), task("b", ["a"])], []),
    /cycle/,
  );
  assert.throws(() => runnableTasks([task("a"), task("a")], []), /Duplicate/);
});
test("THEME-RESOLVE: explicit preferences apply across customer and staff workspaces", () => {
  assert.equal(themePreference("corrupt"), "light");
  assert.equal(resolvedTheme("light", true, "/cart"), "light");
  assert.equal(resolvedTheme("dark", false, "/cart"), "dark");
  assert.equal(resolvedTheme("system", true, "/account"), "dark");
  assert.equal(resolvedTheme("dark", true, "/admin/staff"), "dark");
});
test("THEME-BOOTSTRAP: pre-hydration theme tolerates storage failures and follows system only when requested", () => {
  for (const preference of ["light", "dark", "system", "invalid", null])
    for (const matches of [false, true])
      for (const pathname of ["/", "/admin/settings"]) {
        const root = {
          dataset: {} as Record<string, string>,
          style: {} as Record<string, string>,
        };
        vm.runInNewContext(themeBootstrap, {
          localStorage: { getItem: () => preference },
          location: { pathname },
          matchMedia: () => ({ matches }),
          document: { documentElement: root },
        });
        assert.equal(
          root.dataset.theme,
          resolvedTheme(themePreference(preference), matches, pathname),
        );
      }
  const root = { dataset: {} as Record<string, string>, style: {} };
  vm.runInNewContext(themeBootstrap, {
    localStorage: {
      getItem: () => {
        throw Error("blocked");
      },
    },
    document: { documentElement: root },
  });
  assert.equal(root.dataset.theme, "light");
});
test("BLK-04: readiness explains inherited blockers and demands reassessment after resolution", async () => {
  const { taskReadiness } = await import(
    "../packages/business-rules/src/task-register"
  );
  const tasks = [
    task("schema", [], ["database"], "BLOCKED"),
    task("workflow", ["schema"]),
    task("theme"),
  ];
  const blocked = taskReadiness(tasks, ["database"]);
  assert.deepEqual(blocked.find((t) => t.id === "workflow")?.activeBlockers, [
    "database",
  ]);
  assert.equal(blocked.find((t) => t.id === "theme")?.ready, true);
  const resolved = taskReadiness(tasks, []);
  assert.equal(
    resolved.find((t) => t.id === "schema")?.needsReassessment,
    true,
  );
  assert.equal(resolved.find((t) => t.id === "workflow")?.ready, false);
});
test("THEME-CONTRAST: dark text, muted text, CTA and input boundaries meet declared contrast thresholds", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile("apps/web/app/theme.css", "utf8");
  const block = css.slice(
    css.indexOf('html[data-theme="dark"] {'),
    css.indexOf('html[data-theme="light"]'),
  );
  const token = (key: string) =>
    block.match(new RegExp("--" + key + ": (#[a-f0-9]{6});"))![1];
  const lum = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb.reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [lum(a), lum(b)].sort((a, b) => a - b);
    return (y + 0.05) / (x + 0.05);
  };
  for (const surface of [
    "page",
    "surface",
    "raised",
    "input",
    "secondary",
    "accent",
    "footer",
  ])
    for (const fg of ["foreground", "muted"])
      assert.ok(
        ratio(token(fg), token(surface)) >= 4.5,
        fg + " against " + surface,
      );
  assert.ok(ratio(token("primary-foreground"), token("primary")) >= 4.5);
  assert.ok(ratio(token("border"), token("input")) >= 3);
  assert.ok(ratio(token("ring"), token("input")) >= 3);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});
test("THEME-ROLLBACK: the deployment flag forces light before hydration without overwriting a stored dark preference", async () => {
  const { themeBootstrapFor } = await import(
    "../packages/business-rules/src/theme"
  );
  const root = {
    dataset: {} as Record<string, string>,
    style: {} as Record<string, string>,
  };
  let writes = 0;
  vm.runInNewContext(themeBootstrapFor(false), {
    localStorage: { getItem: () => "dark", setItem: () => writes++ },
    location: { pathname: "/" },
    document: { documentElement: root },
  });
  assert.equal(root.dataset.theme, "light");
  assert.equal(root.style.colorScheme, "light");
  assert.equal(writes, 0);
  assert.equal(themeBootstrapFor(true), themeBootstrap);
});

test("THEME-STAFF: every administration route honours light, dark and system without role-specific exceptions", () => {
  for (const path of [
    "/admin",
    "/admin/settings",
    "/admin/staff",
    "/admin/products",
    "/admin/bookings",
    "/admin/deliveries",
    "/admin/finance",
  ]) {
    assert.equal(resolvedTheme("light", true, path), "light");
    assert.equal(resolvedTheme("dark", false, path), "dark");
    assert.equal(resolvedTheme("system", true, path), "dark");
    assert.equal(resolvedTheme("system", false, path), "light");
  }
});
