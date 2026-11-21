import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { sensitiveActionRequest } from "../apps/web/components/sensitive-action-request";
const expired = () =>
  Object.assign(new Error("Verify password"), {
    status: 403,
    code: "REAUTH_REQUIRED",
    verificationContext: "session-A",
  });
test("SVERIFY-REQUEST: retries only an explicit expiry once, preserves exact request and stops all cancellation, context, network and permission exceptions", async () => {
  for (const condition of [
    "success",
    "cancel",
    "changed",
    "aborted",
    "second-expiry",
    "network",
    "forbidden",
  ]) {
    let sends = 0,
      verifies = 0,
      identities = 0;
    const run = () =>
      sensitiveActionRequest({
        send: async () => {
          sends++;
          if (sends === 1) {
            if (condition === "network") throw new Error("Network lost");
            if (condition === "forbidden")
              throw Object.assign(new Error("Forbidden"), {
                status: 403,
                code: "FORBIDDEN",
              });
            throw expired();
          }
          if (condition === "second-expiry") throw expired();
          return { ok: true };
        },
        identity: async () => {
          identities++;
          return condition === "changed" && identities === 2
            ? "other-session"
            : "session-A";
        },
        verify: async () => {
          verifies++;
          return condition !== "cancel";
        },
        current: () => condition !== "aborted",
      });
    if (condition === "success") assert.deepEqual(await run(), { ok: true });
    else await assert.rejects(run);
    assert.equal(
      sends,
      ["success", "second-expiry"].includes(condition) ? 2 : 1,
      condition,
    );
    assert.equal(
      verifies,
      ["network", "forbidden", "aborted"].includes(condition) ? 0 : 1,
      condition,
    );
  }
});
const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-sensitive-ui-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "browser.tsx");
await fs.writeFile(
  shim,
  `import React from 'react';export const createPortal=(children)=>children;export const usePathname=()=>globalThis.verifyPath;export default function Link({children,...props}){return <a {...props}>{children}</a>}`,
);
await build({
  stdin: {
    contents: `export {api} from './apps/web/components/ui';export {AppDialogProvider} from './apps/web/components/app-dialog';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(temp, "ui.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "browser-environment",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          { filter: /^(react-dom|next\/navigation|next\/link)$/ },
          () => ({ path: shim }),
        );
      },
    },
  ],
});
const { api, AppDialogProvider } = createRequire(import.meta.url)(
  path.join(temp, "ui.cjs"),
);
function environment() {
  const old = {
    window: (globalThis as any).window,
    document: (globalThis as any).document,
    fetch: globalThis.fetch,
  };
  const listeners = new Map<string, Set<Function>>(),
    events: string[] = [];
  (globalThis as any).verifyPath = "/admin/inventory";
  (globalThis as any).window = {
    location: {
      href: "https://demo.test/admin/inventory",
      pathname: "/admin/inventory",
      assign: (p: string) => events.push(p),
    },
    addEventListener: (k: string, f: Function) => {
      if (!listeners.has(k)) listeners.set(k, new Set());
      listeners.get(k)!.add(f);
    },
    removeEventListener: (k: string, f: Function) =>
      listeners.get(k)?.delete(f),
    dispatchEvent: (e: any) => {
      events.push(e.type);
      listeners.get(e.type)?.forEach((f) => f(e));
    },
  };
  (globalThis as any).document = {
    body: { style: { overflow: "" } },
    activeElement: null,
    addEventListener() {},
    removeEventListener() {},
  };
  return { events, restore: () => Object.assign(globalThis, old) };
}
const response = (status: number, data: any) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
const tick = () => new Promise((r) => setTimeout(r, 0));
test("SVERIFY-DIALOG: actual shared api and password dialog retain exact payload, clear wrong passwords, block repeat submits and complete once for every guarded site", async () => {
  const env = environment();
  let tree: any;
  const password = { value: "", focus() {} };
  try {
    await act(async () => {
      tree = create(React.createElement(AppDialogProvider), {
        createNodeMock: (e: any) => (e.type === "input" ? password : null),
      });
    });
    const inventory = JSON.parse(
      await fs.readFile(
        "docs/sensitive-action-verification/inventory.json",
        "utf8",
      ),
    );
    for (const site of inventory.guardSites) {
      const calls: any[] = [];
      let committed = false;
      (globalThis as any).fetch = async (url: string, options: any) => {
        calls.push({ url, body: options?.body, headers: options?.headers });
        if (url === "/api/me")
          return response(200, {
            verificationContext: "session-A",
            user: { id: "same-user", role: "owner", branchId: "lagos" },
          });
        if (url === "/api/reauth") {
          const d = JSON.parse(options.body);
          if (d.password === "incorrect")
            return response(403, {
              error: "Password verification failed.",
              code: "REAUTH_INVALID",
            });
          return response(200, { ok: true });
        }
        if (!committed) {
          committed = true;
          return response(403, {
            error: "Verify password",
            code: "REAUTH_REQUIRED",
            verificationContext: "session-A",
          });
        }
        return response(200, { ok: true });
      };
      const data = {
        id: "fixture-record",
        version: 3,
        operationKey: "fixture-stable-key",
        reason: site.id,
      };
      let pending: Promise<any>;
      await act(async () => {
        pending = api("synthetic.sensitive", data);
        await tick();
      });
      const input = tree.root.findByType("input");
      assert.equal(input.props.type, "password");
      assert.equal(input.props.autoComplete, "current-password");
      assert.equal(input.props.required, true);
      assert.match(JSON.stringify(tree.toJSON()), /Verify and continue/);
      assert.equal(
        calls.filter((c) => c.url === "/api/synthetic.sensitive").length,
        1,
      );
      if (site === inventory.guardSites[0]) {
        password.value = "incorrect";
        await act(async () =>
          tree.root.findByType("form").props.onSubmit({ preventDefault() {} }),
        );
        assert.match(
          JSON.stringify(tree.toJSON()),
          /Password verification failed/,
        );
        assert.equal(password.value, "");
        assert.equal(
          calls.filter((c) => c.url === "/api/synthetic.sensitive").length,
          1,
        );
      }
      data.reason = "edited-after-submit"; // transport must not mutate the reviewed snapshot
      password.value = "fixture-correct";
      await act(async () => {
        const submit = tree.root.findByType("form").props.onSubmit;
        await Promise.all([
          submit({ preventDefault() {} }),
          submit({ preventDefault() {} }),
        ]);
        await pending!;
      });
      const business = calls.filter(
        (c) => c.url === "/api/synthetic.sensitive",
      );
      assert.equal(business.length, 2);
      assert.equal(business[0].body, business[1].body);
      assert.equal(
        business[1].headers["X-Easygas-Verification-Context"],
        "session-A",
      );
      assert.equal(JSON.parse(business[1].body).reason, site.id);
      assert.doesNotMatch(business[1].body, /password|fixture-correct/);
      assert.equal(
        calls.filter(
          (c) =>
            c.url === "/api/reauth" &&
            JSON.parse(c.body).password === "fixture-correct",
        ).length,
        1,
      );
      assert.equal(password.value, "");
      assert.equal(tree.toJSON(), null);
    }
    assert.equal(
      env.events.filter((e) => e === "easygas:committed").length,
      inventory.guardSites.length,
      "reauth does not refresh or discard background forms",
    );
  } finally {
    if (tree) await act(async () => tree.unmount());
    env.restore();
  }
});
test("SVERIFY-CANCEL: actual dialog cancellation, route changes, replacement sessions and no-provider fail closed without replay", async () => {
  for (const scenario of [
    "cancel",
    "navigation",
    "session-before",
    "session-after",
    "unauthenticated",
    "no-provider",
  ]) {
    const env = environment();
    let tree: any,
      sends = 0,
      reads = 0,
      password = { value: "", focus() {} };
    try {
      if (scenario !== "no-provider")
        await act(async () => {
          tree = create(React.createElement(AppDialogProvider), {
            createNodeMock: (e: any) => (e.type === "input" ? password : null),
          });
        });
      (globalThis as any).fetch = async (url: string) => {
        if (url === "/api/me") {
          reads++;
          return response(200, {
            verificationContext:
              scenario === "session-before" ||
              (scenario === "session-after" && reads > 1)
                ? "session-B"
                : "session-A",
            user: { id: "same-user", role: "owner", branchId: "lagos" },
          });
        }
        if (url === "/api/reauth") return response(200, { ok: true });
        sends++;
        return response(403, {
          code: "REAUTH_REQUIRED",
          error: "Verify password",
          verificationContext: "session-A",
        });
      };
      let outcome: Promise<any>;
      await act(async () => {
        outcome = api("expense.create", { operationKey: "same-key" }).then(
          () => null,
          (e: any) => e,
        );
        await tick();
      });
      if (
        ["cancel", "navigation", "session-after", "unauthenticated"].includes(
          scenario,
        )
      ) {
        await act(async () => {
          if (scenario === "cancel")
            tree.root
              .findAllByType("button")
              .find((b: any) => b.children.includes("Cancel"))
              .props.onClick();
          if (scenario === "navigation") {
            (globalThis as any).window.location.href =
              "https://demo.test/admin/orders";
            (globalThis as any).verifyPath = "/admin/orders";
            tree.update(React.createElement(AppDialogProvider));
          }
          if (scenario === "unauthenticated")
            (globalThis as any).window.dispatchEvent(
              new Event("easygas:unauthenticated"),
            );
          if (scenario === "session-after") {
            password.value = "fixture-correct";
            await tree.root
              .findByType("form")
              .props.onSubmit({ preventDefault() {} });
          }
        });
      }
      const error = await outcome!;
      assert.ok(error);
      assert.equal(sends, 1, scenario);
    } finally {
      if (tree) await act(async () => tree.unmount());
      env.restore();
    }
  }
});
test("SVERIFY-READ: protected privilege reads recover too, while simultaneous challenges never resume a second action", async () => {
  const env = environment();
  let tree: any;
  const password = { value: "", focus() {} };
  const calls: any[] = [];
  try {
    await act(async () => {
      tree = create(React.createElement(AppDialogProvider), {
        createNodeMock: (e: any) => (e.type === "input" ? password : null),
      });
    });
    let reads = 0;
    (globalThis as any).fetch = async (url: string, options: any) => {
      calls.push({ url, options });
      if (url === "/api/me")
        return response(200, {
          verificationContext: "session-A",
          user: { id: "same-user", role: "owner", branchId: "lagos" },
        });
      if (url === "/api/reauth") return response(200, { ok: true });
      if (url === "/api/staff.privileges?userId=fixture" && ++reads === 2)
        return response(200, { privileges: [] });
      return response(403, {
        error: "Verify password",
        code: "REAUTH_REQUIRED",
        verificationContext: "session-A",
      });
    };
    let first: Promise<any>, second: Promise<any>;
    await act(async () => {
      first = api("staff.privileges?userId=fixture");
      await tick();
    });
    await act(async () => {
      second = api("expense.create", { reason: "another action" }).catch(
        (e: any) => e,
      );
      await tick();
    });
    assert.equal((await second!).code, "VERIFICATION_CANCELLED");
    password.value = "fixture-correct";
    await act(async () => {
      await tree.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {} });
      await first!;
    });
    const protectedCalls = calls.filter((c) =>
      c.url.startsWith("/api/staff.privileges"),
    );
    assert.equal(protectedCalls.length, 2);
    assert.equal(protectedCalls[1].options.body, undefined);
    assert.equal(
      protectedCalls[1].options.headers["X-Easygas-Verification-Context"],
      "session-A",
    );
    assert.equal(
      calls.filter((c) => c.url === "/api/expense.create").length,
      1,
    );
  } finally {
    if (tree) await act(async () => tree.unmount());
    env.restore();
  }
});
