import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-accept-ui-"));
after(() => fs.rm(dir, { recursive: true, force: true }));
const stub = path.join(dir, "stub.tsx");
await fs.writeFile(
  stub,
  `import React from 'react';
export const Button=({label,onPress,...props})=><button {...props} onPress={onPress}>{label}</button>;
export const Copy=({children})=><p>{children}</p>;export const Title=Copy;export const Notice=({message})=><p role="alert">{message}</p>;
export const Card=({children})=><section>{children}</section>;export const Feedback=()=>null;
export const NativeForm=props=><decline-form {...props}/>;export const ServiceForm=props=><decline-form {...props}/>;
export const ScreenModal=({visible,children})=>visible?<dialog>{children}</dialog>:null;
export const View=({children})=><div>{children}</div>;export const ScrollView=View;
export const AppState={currentState:'active',addEventListener:()=>({remove(){}})};export const Platform={OS:'ios'};
export const useTheme=()=>({colors:{}});export const useAudioPlayer=()=>({pause(){},play(){},seekTo:async()=>{}});export const useAudioPlayerStatus=()=>({playing:false});export const setAudioModeAsync=async()=>{};
export const getPermissionsAsync=async()=>({granted:false});export const setNotificationHandler=()=>{};export const addNotificationResponseReceivedListener=()=>({remove(){}});export const getPresentedNotificationsAsync=async()=>[];export const dismissNotificationAsync=async()=>{};
export const getItemAsync=async()=>null;export const setItemAsync=async()=>{};export const digestStringAsync=async()=>"synthetic-scope";export const CryptoDigestAlgorithm={SHA256:'SHA256'};export const randomUUID=()=>globalThis.crypto.randomUUID();`,
);
for (const [kind, entry] of [
  ["mobile", "apps/mobile/AssignmentResponseActions.tsx"],
  ["web", "apps/web/components/assignment-response-actions.tsx"],
  ["popup", "apps/mobile/DriverAssignmentAlerts.tsx"],
])
  await build({
    entryPoints: [entry],
    outfile: path.join(dir, kind + ".cjs"),
    bundle: true,
    format: "cjs",
    platform: "node",
    jsx: "automatic",
    plugins: [
      {
        name: "host-adapters",
        setup(b) {
          b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
            path: req.resolve(a.path),
            external: true,
          }));
          b.onResolve(
            {
              filter:
                /^(react-native|expo-.+|\.\/(CustomerUI|Workflows|professional-services|ui|ScreenCanvas|theme))$/,
            },
            () => ({ path: stub }),
          );
          b.onLoad({ filter: /driver-assignment\.wav$/ }, () => ({
            contents: 'module.exports="synthetic-audio";',
            loader: "js",
          }));
        },
      },
    ],
  });
for (const kind of ["mobile", "web"])
  test(`ACCEPT-UI-${kind}: one tap, no text field; busy/double-submit lock, retry key, decline-only reason and honest refresh failure`, async () => {
    const mod = req(path.join(dir, kind + ".cjs")),
      Component = mod.default ?? mod.AssignmentResponseActions;
    let tree: any,
      calls: any[] = [],
      resolve: any,
      fail = true;
    const send = async (v: any) => {
      calls.push(v);
      if (fail) throw Error("Synthetic network error");
      await new Promise((r) => (resolve = r));
      return { ok: true };
    };
    const props =
      kind === "mobile"
        ? {
            api: (_: string, v: any) => send(v),
            action: "dispatch.respond",
            input: { orderId: "synthetic", version: 2 },
            onDone: async () => {
              throw Error("refresh failed");
            },
          }
        : {
            send,
            declineDecision: "rejected",
            done: async () => {
              throw Error("refresh failed");
            },
          };
    await act(async () => {
      tree = create(React.createElement(Component, props));
    });
    const button = (label: string) =>
      tree.root
        .findAllByType("button")
        .find((b: any) => b.children.join("") === label);
    assert.equal(tree.root.findAllByType("decline-form").length, 0);
    await act(async () =>
      button("Accept order").props[kind === "mobile" ? "onPress" : "onClick"](),
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].decision, "acknowledged");
    assert.ok(calls[0].operationKey);
    assert.equal("reason" in calls[0], false);
    assert.match(JSON.stringify(tree.toJSON()), /Synthetic network error/);
    await act(async () =>
      button("Decline order").props[
        kind === "mobile" ? "onPress" : "onClick"
      ](),
    );
    if (kind === "mobile")
      assert.deepEqual(
        tree.root
          .findByType("decline-form")
          .props.fields.map((f: any) => f.name),
        ["reason"],
      );
    else assert.equal(tree.root.findByType("textarea").props.required, true);
    fail = false;
    const press =
      button("Accept order").props[kind === "mobile" ? "onPress" : "onClick"];
    await act(async () => {
      press();
      press();
      await Promise.resolve();
    });
    assert.equal(calls.length, 2);
    assert.equal(calls[1].operationKey, calls[0].operationKey);
    assert.equal(
      button(kind === "mobile" ? "Accepting…" : "Sending…").props.disabled,
      true,
    );
    await act(async () => {
      resolve();
      await new Promise((r) => setTimeout(r, 0));
    });
    assert.match(JSON.stringify(tree.toJSON()), /Order accepted. Refresh/);
    assert.equal(button("Accept order"), undefined);
    await act(async () => tree.unmount());
  });
test("ACCEPT-UI-POPUP: actual driver alert accepts without a field, rechecks current assignment and never writes from Review or dismissal", async () => {
  const Component = req(path.join(dir, "popup.cjs")).default;
  const row = {
    id: "11111111-1111-4111-8111-111111111111",
    reference: "SYNTHETIC",
    driver_id: "driver",
    branch_id: "lagos",
    status: "assigned",
    tracking_version: 3,
    assignment_response_open: true,
    attempt: {
      id: "22222222-2222-4222-8222-222222222222",
      driver_id: "driver",
      state: "assigned",
    },
  };
  const calls: any[] = [],
    reviews: any[] = [];
  const api = async (action: string, input: any) => {
    calls.push({ action, input });
    return action === "driver.snapshot"
      ? { responses: [] }
      : action.startsWith("orders?")
        ? [row]
        : { ok: true };
  };
  let tree: any;
  await act(async () => {
    tree = create(
      React.createElement(Component, {
        api,
        user: { id: "driver", branch_id: "lagos" },
        origin: "synthetic",
        orders: [row],
        snapshot: { responses: [] },
        connected: true,
        revoked: false,
        showSettings: false,
        onReview: (o: any) => reviews.push(o),
        onRefresh: async () => {},
      }),
    );
    await new Promise((r) => setTimeout(r, 0));
  });
  const button = (label: string) =>
    tree.root
      .findAllByType("button")
      .find((b: any) => b.children.join("") === label);
  assert.ok(button("Accept order"));
  assert.equal(button("Accept order").props.disabled, false);
  assert.doesNotMatch(
    JSON.stringify(tree.toJSON()),
    /Acknowledgement reason|Received|TextInput/,
  );
  assert.equal(calls.length, 0);
  await act(async () => {
    button("Accept order").props.onPress();
    await new Promise((r) => setTimeout(r, 0));
  });
  const writes = calls.filter((c) => c.input);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].action, "dispatch.respond");
  assert.equal(writes[0].input.decision, "acknowledged");
  assert.equal("reason" in writes[0].input, false);
  assert.ok(writes[0].input.operationKey);
  assert.equal(reviews[0].id, row.id);
  assert.match(JSON.stringify(tree.toJSON()), /Order accepted/);
  const props = tree.root.findByType(Component).props;
  await act(async () =>
    tree.update(
      React.createElement(Component, {
        ...props,
        selectedOrderId: "another-current-delivery",
      }),
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(tree.toJSON()),
    /Order accepted/,
    "Another order must not inherit the accepted order's next-action notice",
  );
  await act(async () =>
    tree.update(
      React.createElement(Component, { ...props, selectedOrderId: row.id }),
    ),
  );
  assert.match(JSON.stringify(tree.toJSON()), /Order accepted/);
  await act(async () =>
    tree.update(
      React.createElement(Component, {
        ...props,
        orders: [
          {
            ...row,
            status: "out_for_delivery",
            attempt: { ...row.attempt, state: "picked_up" },
          },
        ],
        snapshot: {
          responses: [{ order_id: row.id, decision: "acknowledged" }],
        },
      }),
    ),
  );
  assert.doesNotMatch(
    JSON.stringify(tree.toJSON()),
    /Order accepted|Pickup and delivery are still separate steps/,
  );
  await act(async () => tree.unmount());
});
