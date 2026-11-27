import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";

import { deliveryAddressKey } from "../packages/business-rules/src/delivery-pin";

const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const dir = await fs.mkdtemp(
  path.join(os.tmpdir(), "easygas-seam-components-"),
);
after(() => fs.rm(dir, { force: true, recursive: true }));
const host = path.join(dir, "host.tsx");
await fs.writeFile(
  host,
  `import React from 'react';export const View=({children,...p})=><section {...p}>{children}</section>;export const Text=({children,...p})=><p {...p}>{children}</p>;export const Copy=Text;export const Card=View;export const ActionLoadingIndicator=View;export const api=async()=>globalThis.seamProfile;export const Title=Text;export const Feedback=Text;export const NativeForm=p=><form {...p}/>;export const FieldCaption=Text;export const TextInput=p=><input {...p}/>;export const Switch=p=><input type="checkbox" {...p}/>;export const Button=({label,...p})=><button {...p}>{label}</button>;export const Platform={OS:'android'};export const useTheme=()=>({colors:{text:'#123e30',surface:'#fff',border:'#ddd'}});export const Accuracy={High:6};export const requestForegroundPermissionsAsync=async()=>globalThis.seamPermission;export const getCurrentPositionAsync=async()=>globalThis.seamPosition;`,
);
const leaflet = path.join(dir, "leaflet.ts");
await fs.writeFile(
  leaflet,
  `export const map=()=>({setView(){return this},getZoom(){return 17},on(event,fn){globalThis.seamMapClick=fn;return this},remove(){}});export const tileLayer=()=>({on(event,fn){globalThis.seamTileError=fn;return this},addTo(){return this}});export const circleMarker=()=>({addTo(){return this},remove(){}});`,
);
async function component(file: string, name: string) {
  await build({
    entryPoints: [file],
    outfile: path.join(dir, name + ".cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    loader: { ".css": "empty" },
    plugins: [
      {
        name: "test-host",
        setup(b) {
          b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
            path: req.resolve(a.path),
            external: true,
          }));
          b.onResolve(
            {
              filter:
                /^(react-native|expo-location|\.\/(CustomerUI|theme|typography|Workflows|ui|easygas-loader))$/,
            },
            () => ({ path: host }),
          );
          b.onResolve({ filter: /^react-native-maps$/ }, () => ({
            path: "react-native-maps",
            external: true,
          }));
          b.onResolve({ filter: /^leaflet$/ }, () => ({ path: leaflet }));
        },
      },
    ],
  });
  return req(path.join(dir, name + ".cjs")).default;
}
const NativePin = await component(
  "apps/mobile/DeliveryPinPicker.tsx",
  "native-pin",
);
const WebPin = await component(
  "apps/web/components/delivery-pin-picker.tsx",
  "web-pin",
);
const street = "27 Synthetic Street",
  zone = "Victoria Island";
const button = (tree: any, label: string) =>
  tree.root
    .findAllByType("button")
    .find((n: any) => n.children.join("") === label);
const checkbox = (tree: any) =>
  tree.root
    .findAllByType("input")
    .find((n: any) => n.props.type === "checkbox");
const outside = { latitude: -27.63705, longitude: 152.85417 };
const inside = { latitude: 6.43, longitude: 3.42 };
for (const native of [false, true])
  test(`PIN-UI-${native ? "NATIVE" : "WEB"} GPS/manual/saved mismatch cannot be confirmed; corrected pin and changed-area boundary recover`, async () => {
    let tree: any,
      changes: any[] = [];
    const props = { street, zone, onChange: (p: any) => changes.push(p) };
    (globalThis as any).seamPermission = { granted: true };
    (globalThis as any).seamPosition = { coords: outside };
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        geolocation: {
          getCurrentPosition: (ok: any) => ok({ coords: outside }),
        },
      },
    });
    const C = native ? NativePin : WebPin;
    await act(async () => {
      tree = create(React.createElement(C, props), {
        createNodeMock: () => ({}),
      });
    });
    await act(async () => {
      await button(tree, "Use my current location").props[
        native ? "onPress" : "onClick"
      ]();
    });
    assert.match(JSON.stringify(tree.toJSON()), /outside Victoria Island/);
    assert.equal(checkbox(tree).props.disabled, true);
    // Calling a disabled handler directly still must not produce a confirmed point.
    await act(async () =>
      native
        ? checkbox(tree).props.onValueChange(true)
        : checkbox(tree).props.onChange({ target: { checked: true } }),
    );
    assert.equal(changes.at(-1), undefined);
    if (native)
      await act(async () =>
        button(tree, "Paste a map link or coordinates").props.onPress(),
      );
    const input = () =>
      tree.root
        .findAllByType("input")
        .find((n: any) =>
          native ? n.props.onChangeText : n.props.placeholder === "6.45, 3.46",
        );
    await act(async () =>
      native
        ? input().props.onChangeText("6.43,3.42")
        : input().props.onChange({ target: { value: "6.43,3.42" } }),
    );
    await act(async () =>
      button(tree, "Use this location").props[native ? "onPress" : "onClick"](),
    );
    assert.equal(checkbox(tree).props.disabled, false);
    await act(async () =>
      native
        ? checkbox(tree).props.onValueChange(true)
        : checkbox(tree).props.onChange({ target: { checked: true } }),
    );
    const pin = changes.at(-1);
    assert.deepEqual(pin, {
      ...inside,
      confirmed: true,
      addressKey: deliveryAddressKey(street, zone),
    });
    await act(async () =>
      tree.update(React.createElement(C, { ...props, value: pin })),
    );
    assert.equal(checkbox(tree).props[native ? "value" : "checked"], true);
    // Governance boundary changes invalidate even an address-bound, formerly valid pin.
    await act(async () =>
      tree.update(
        React.createElement(C, {
          ...props,
          value: pin,
          area: {
            name: zone,
            map_bounds: { south: 6.44, north: 6.45, west: 3.42, east: 3.44 },
          },
        }),
      ),
    );
    assert.equal(checkbox(tree).props[native ? "value" : "checked"], false);
    assert.equal(checkbox(tree).props.disabled, true);
    assert.match(JSON.stringify(tree.toJSON()), /outside Victoria Island/);
    await act(async () => tree.unmount());
    // Saved overseas pin cannot start out looking confirmed.
    await act(async () => {
      tree = create(
        React.createElement(C, {
          ...props,
          value: {
            ...outside,
            confirmed: true,
            addressKey: deliveryAddressKey(street, zone),
          },
        }),
        { createNodeMock: () => ({}) },
      );
    });
    assert.equal(checkbox(tree).props[native ? "value" : "checked"], false);
    assert.match(JSON.stringify(tree.toJSON()), /outside Victoria Island/);
    await act(async () => tree.unmount());
  });
