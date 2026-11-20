import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import ts from "typescript";
const require = createRequire(
    process.env.EASYGAS_NATIVE_TEST_PACKAGE ??
      path.resolve("tests/native-renderer/package.json"),
  ),
  React = require("react"),
  { create, act } = require("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-orders-text-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "hosts.tsx");
await fs.writeFile(
  shim,
  "import React from 'react';export const View='View',Text='Text',Pressable='Pressable',Image='Image';export const NativeForm=({title}:any)=>React.createElement(View,null,React.createElement(Text,null,title));",
);
const review = JSON.parse(
  await fs.readFile(
    "docs/mobile-orders-text-fix/reviewed-source-changes.json",
    "utf8",
  ),
);
async function component(source: string, name: string) {
  const output = path.join(temp, name + ".cjs");
  await build({
    stdin: {
      contents: source,
      resolveDir: path.resolve("apps/mobile"),
      loader: "tsx",
    },
    outfile: output,
    bundle: true,
    format: "cjs",
    platform: "node",
    jsx: "automatic",
    plugins: [
      {
        name: "text-host-test",
        setup(b) {
          b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
            path: require.resolve(a.path),
            external: true,
          }));
          b.onResolve(
            { filter: /^(react-native|\.\/(typography|Workflows))$/ },
            () => ({ path: shim }),
          );
        },
      },
    ],
  });
  return createRequire(import.meta.url)(output).default;
}
const [Before, OrderVisit] = await Promise.all([
  component(
    execFileSync(
      "git",
      ["show", review.baseCommit + ":apps/mobile/OrderVisit.tsx"],
      { encoding: "utf8" },
    ),
    "before",
  ),
  component(await fs.readFile("apps/mobile/OrderVisit.tsx", "utf8"), "fixed"),
]);
function safe(node: any) {
  if (node == null) return;
  if (Array.isArray(node)) {
    node.forEach(safe);
    return;
  }
  if (typeof node !== "object") return;
  for (const child of node.children ?? []) {
    if (
      (typeof child === "string" && child.length > 0) ||
      typeof child === "number"
    )
      assert.equal(
        node.type,
        "Text",
        `Bare native text ${JSON.stringify(child)} under ${node.type}`,
      );
    else safe(child);
  }
}
const props = (api: any, driver = false, status = "delivered") => ({
  api,
  driver,
  order: {
    id: "synthetic-order",
    customer_id: "synthetic-customer",
    status,
    tracking_version: 1,
  },
  user: { id: "synthetic-customer", role: driver ? "driver" : "customer" },
  origin: "https://demo.example.test",
  token: "synthetic-token",
  onDone() {},
});
async function mount(C: any, p: any) {
  let tree: any;
  await act(async () => {
    tree = create(React.createElement(C, p));
  });
  return tree;
}
async function dispose(tree: any) {
  await act(async () => tree.unmount());
}
test("ORDTXT-REPRO: original OrderVisit emits a literal native View child; repaired customer and driver states do not", async () => {
  const api = async () => {
    throw Error("Must not fetch on initial render");
  };
  const old = await mount(Before, props(api));
  assert.throws(() => safe(old.toJSON()), /Bare native text.*View/);
  await dispose(old);
  for (const driver of [false, true])
    for (const status of [
      "pending",
      "assigned",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ]) {
      const tree = await mount(OrderVisit, props(api, driver, status));
      safe(tree.toJSON());
      await dispose(tree);
    }
});
test("ORDTXT-DETAILS: loaded photos/invoice/amendments and driver forms preserve read contracts without raw text or writes", async () => {
  for (const driver of [false, true])
    for (const excess of [0, 100]) {
      const calls: any[] = [];
      const api = async (a: string, d: any) => {
        calls.push({ a, d });
        if (a.startsWith("delivery.photos"))
          return {
            photos: [
              {
                id: "synthetic-photo",
                alt: "Synthetic delivery photo",
                created_at: "2026-11-21T01:00:00Z",
              },
            ],
          };
        if (a === "doorstep.list")
          return {
            commitEnabled: true,
            amendments: [
              {
                id: "amendment",
                state: "proposed",
                proposal: { lines: [{ kg: 1, capacityKg: 6 }] },
                price_snapshot: {
                  quote: {
                    subtotalKobo: 100,
                    physicalSubtotalKobo: 0,
                    physicalLines: [],
                  },
                },
                execution: {
                  state: "reserved",
                  note_state: "approved",
                  amount_kobo: 100,
                  load_version: 1,
                  cylinder_lines: [],
                },
                product_execution: {
                  state: "reserved",
                  note_state: "approved",
                  amount_kobo: 100,
                },
              },
            ],
          };
        if (a === "invoice.order")
          return {
            invoice: {
              invoice_number: "QA-INVOICE",
              status: "issued",
              total_kobo: 100,
              effectiveTotalKobo: 100,
              amountDueKobo: 0,
              overpaidKobo: excess,
            },
          };
        throw Error("Unexpected action " + a);
      };
      const tree = await mount(
        OrderVisit,
        props(api, driver, "out_for_delivery"),
      );
      await act(async () => {
        await tree.root
          .findAllByType("Pressable")
          .find((node: any) =>
            node
              .findAllByType("Text")
              .some(
                (text: any) =>
                  text.props.children ===
                  "View visit changes, photos and invoice",
              ),
          )
          .props.onPress();
      });
      safe(tree.toJSON());
      assert.deepEqual(
        calls.map((c) => c.a),
        driver
          ? ["delivery.photos?orderId=synthetic-order", "doorstep.list"]
          : [
              "delivery.photos?orderId=synthetic-order",
              "doorstep.list",
              "invoice.order",
            ],
      );
      assert.ok(
        calls
          .filter((c) => c.d)
          .every((c) => c.d.orderId === "synthetic-order"),
      );
      assert.match(JSON.stringify(tree.toJSON()), /Synthetic delivery photo/);
      await dispose(tree);
    }
});
test("ORDTXT-ERRORS: offline/forbidden visit reads remain visible Text feedback and never perform a mutation", async () => {
  for (const message of [
    "Connection unavailable",
    "You do not have permission",
  ]) {
    let calls = 0;
    const tree = await mount(
      OrderVisit,
      props(async () => {
        calls++;
        throw Error(message);
      }),
    );
    await act(async () => {
      await tree.root
        .findAllByType("Pressable")
        .find((node: any) =>
          node
            .findAllByType("Text")
            .some(
              (text: any) =>
                text.props.children ===
                "View visit changes, photos and invoice",
            ),
        )
        .props.onPress();
    });
    safe(tree.toJSON());
    assert.match(JSON.stringify(tree.toJSON()), new RegExp(message));
    assert.equal(calls, 1);
    await dispose(tree);
  }
});
test("ORDTXT-GUARD: explicit JSX string children are allowed only in text hosts across current native screens", async () => {
  const allowed = new Set([
    "Text",
    "Copy",
    "Title",
    "FieldCaption",
    "BaseText",
    "CustomerCopy",
  ]);
  for (const name of await fs.readdir("apps/mobile")) {
    if (!name.endsWith(".tsx")) continue;
    const p = "apps/mobile/" + name,
      ast = ts.createSourceFile(
        p,
        await fs.readFile(p, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
    function walk(n: ts.Node) {
      if (
        ts.isJsxExpression(n) &&
        n.expression &&
        ts.isStringLiteral(n.expression) &&
        n.expression.text.length
      ) {
        let parent: ts.Node | undefined = n.parent;
        while (parent && !ts.isJsxElement(parent)) parent = parent.parent;
        const tag =
          parent && ts.isJsxElement(parent)
            ? parent.openingElement.tagName.getText(ast)
            : "Fragment";
        assert.ok(
          allowed.has(tag),
          p +
            ":" +
            (ast.getLineAndCharacterOfPosition(n.getStart()).line + 1) +
            " renders literal text under " +
            tag,
        );
      }
      ts.forEachChild(n, walk);
    }
    walk(ast);
  }
});
