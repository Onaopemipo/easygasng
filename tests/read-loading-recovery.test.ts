import test, { after } from "node:test";
import assert from "node:assert/strict";
import { withReadDeadline } from "../apps/web/components/read-deadline";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";


const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(
  path.join(os.tmpdir(), "easygas-loading-client-"),
);
after(() => fs.rm(temp, { recursive: true, force: true }));
const browser = path.join(temp, "browser.tsx");
await fs.writeFile(
  browser,
  `import React from 'react';export const createPortal=(c)=>c;export const usePathname=()=>'/admin/orders';export default function Link({children,...p}){return <a {...p}>{children}</a>}`,
);
await build({
  stdin: {
    contents: `export {api} from './apps/web/components/ui';export {useRecordsData} from './apps/web/components/use-records-data';`,
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
      name: "browser",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          { filter: /^(react-dom|next\/navigation|next\/link)$/ },
          () => ({ path: browser }),
        );
      },
    },
  ],
});
const { api, useRecordsData } = createRequire(import.meta.url)(
  path.join(temp, "ui.cjs"),
);
test("LOAD-DEADLINE: stalled headers/body and ignored abort settle once, with no automatic retry; fast success and caller cancellation clear their timers", async () => {
  for (const stage of ["headers", "body"]) {
    let calls = 0,
      readSignal: AbortSignal | undefined;
    const start = performance.now();
    await assert.rejects(
      () =>
        withReadDeadline(
          async (signal) => {
            calls++;
            readSignal = signal;
            if (stage === "body") await Promise.resolve({ status: 200 });
            return await new Promise(() => {});
          },
          undefined,
          25,
        ),
      (e: any) => e.code === "READ_TIMEOUT" && e.status === 408,
    );
    assert.equal(calls, 1);
    assert.equal(readSignal?.aborted, true);
    assert.ok(performance.now() - start < 500);
  }
  let fastSignal: AbortSignal | undefined;
  assert.equal(
    await withReadDeadline(
      async (s) => {
        fastSignal = s;
        return 7;
      },
      undefined,
      20,
    ),
    7,
  );
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(fastSignal?.aborted, false);
  const c = new AbortController();
  let calls = 0;
  const pending = withReadDeadline(
    async () => {
      calls++;
      return await new Promise(() => {});
    },
    c.signal,
    30,
  );
  c.abort();
  await assert.rejects(
    () => pending,
    (e: any) => e.name === "AbortError",
  );
  assert.equal(calls, 0);
});
const response = (status: number, data: any) => ({
  ok: status < 400,
  status,
  json: async () => data,
});
function environment() {
  const prior = { window: (globalThis as any).window, fetch: globalThis.fetch };
  const events: string[] = [];
  (globalThis as any).window = {
    location: {
      href: "https://demo.test/admin/orders",
      pathname: "/admin/orders",
      assign: (s: string) => events.push(s),
    },
    dispatchEvent: (e: any) => events.push(e.type),
  };
  return { events, restore: () => Object.assign(globalThis, prior) };
}
function Harness({
  action,
  scope,
  refresh = 0,
}: {
  action: string;
  scope: string;
  refresh?: number;
}) {
  const r = useRecordsData(action, refresh, scope);
  return React.createElement(
    "section",
    null,
    React.createElement("pre", null, JSON.stringify(r)),
    React.createElement("button", { onClick: r.retry }, "Try again"),
  );
}
const text = (t: any): string =>
  t == null
    ? ""
    : typeof t === "string"
      ? t
      : Array.isArray(t)
        ? t.map(text).join(" ")
        : text(t.children);
test("LOAD-RECOVERY: actual shared API preserves errors/permissions, and scoped hook aborts navigation, rejects late data and retries only on request", async () => {
  const env = environment();
  let tree: any;
  try {
    const pending: any[] = [];
    globalThis.fetch = async (_u: any, options: any) =>
      new Promise((resolve) =>
        pending.push({ resolve, signal: options.signal }),
      );
    await act(async () => {
      tree = create(
        React.createElement(Harness, { action: "orders", scope: "owner-A" }),
      );
    });
    assert.equal(pending.length, 1);
    await act(async () =>
      tree.update(
        React.createElement(Harness, { action: "orders", scope: "finance-B" }),
      ),
    );
    assert.equal(pending[0].signal.aborted, true);
    assert.equal(pending.length, 2);
    await act(async () =>
      pending[0].resolve(response(200, [{ id: "secret-old-owner-row" }])),
    );
    assert.doesNotMatch(text(tree.toJSON()), /secret-old-owner/);
    await act(async () =>
      pending[1].resolve(
        response(403, { error: "No branch permission", code: "FORBIDDEN" }),
      ),
    );
    assert.match(text(tree.toJSON()), /No branch permission/);
    assert.equal(pending.length, 2);
    await act(async () => tree.root.findByType("button").props.onClick());
    assert.equal(pending.length, 3);
    await act(async () =>
      pending[2].resolve(response(200, [{ id: "finance-B-row" }])),
    );
    assert.match(text(tree.toJSON()), /finance-B-row/);
    await act(async () => tree.unmount());
    tree = null;
    let signal: AbortSignal | undefined,
      calls = 0;
    globalThis.fetch = async (_u: any, o: any) => {
      calls++;
      signal = o.signal;
      return response(200, { ok: true }) as any;
    };
    assert.deepEqual(
      await api("order.transition", {
        id: "synthetic",
        operationKey: "one-key",
      }),
      { ok: true },
    );
    assert.equal(calls, 1);
    assert.equal(signal, undefined);
    assert.ok(env.events.includes("easygas:committed"));
    globalThis.fetch = async () =>
      response(401, {
        error: "Session expired",
        code: "UNAUTHENTICATED",
      }) as any;
    await assert.rejects(
      () => api("orders"),
      (e: any) => e.status === 401,
    );
    assert.ok(env.events.includes("easygas:unauthenticated"));
    assert.ok(env.events.includes("/login"));
  } finally {
    if (tree) await act(async () => tree.unmount());
    env.restore();
  }
});

test("LOAD-SOURCE: five exact reviewed web files preserve published baselines and mutations/native source remain outside the loading allowlist", async () => {
  const { reviewedLoadingSourceHash } = await import(
    "../scripts/lib/reviewed-loading-source.mjs"
  );
  const { createHash } = await import("node:crypto");
  const review = JSON.parse(
    await fs.readFile(
      "docs/loading-performance/reviewed-source-changes.json",
      "utf8",
    ),
  );
  for (const [file, baseline] of Object.entries(review.baseline)) {
    assert.equal(
      await reviewedLoadingSourceHash(file, baseline),
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
    );
    await assert.rejects(
      () => reviewedLoadingSourceHash(file, "tampered"),
      /loading repair historical baseline/,
    );
  }
  for (const [file, hash] of Object.entries(review.newFiles))
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      hash,
    );
  assert.equal(
    await reviewedLoadingSourceHash("apps/mobile/App.tsx", "unchanged-native"),
    "unchanged-native",
  );
  assert.equal(
    await reviewedLoadingSourceHash(
      "apps/web/lib/delivery.ts",
      "unchanged-mutation",
    ),
    "unchanged-mutation",
  );
});
