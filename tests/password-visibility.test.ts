import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FormInput } from "../apps/web/components/password-input";

test("PWD-01: password defaults masked and reveal control cannot submit the form", () => {
  const html = renderToStaticMarkup(React.createElement(FormInput, { type: "password", name: "password", defaultValue: "test-only", autoComplete: "current-password", required: true }));
  assert.match(html, /type="password"/);
  assert.match(html, /name="password"/);
  assert.match(html, /autoComplete="current-password"/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="Show password"/);
  assert.match(html, /aria-pressed="false"/);
});
test("PWD-02: disabled password remains disabled and normal inputs have no reveal button", () => {
  const disabled = renderToStaticMarkup(React.createElement(FormInput, { type: "password", disabled: true }));
  assert.match(disabled, /<button[^>]*disabled=""/);
  const normal = renderToStaticMarkup(React.createElement(FormInput, { type: "email", name: "email" }));
  assert.doesNotMatch(normal, /button/);
  assert.match(normal, /type="email"/);
});

test("PWD-03: every audited web and native password entry uses the shared visibility control", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const file of ["admin", "site", "phone-completion", "workflows", "professional-services", "operations-completion"]) {
    const source = await readFile(`apps/web/components/${file}.tsx`, "utf8");
    assert.match(source, /import \{ FormInput \} from "\.\/password-input"/);
    assert.doesNotMatch(source, /<input\b/);
  }
  for (const file of ["App", "Workflows", "DriverSignIn", "TechnicianSignIn"]) {
    const source = await readFile(`apps/mobile/${file}.tsx`, "utf8");
    assert.match(source, /TextInput/);
    assert.match(source, /from "\.\/typography"/);
    assert.doesNotMatch(source, /TextInput[^;]*from "react-native"/);
  }
  const native = await readFile("apps/mobile/typography.tsx", "utf8");
  assert.match(native, /secureTextEntry=\{Boolean\(props.secureTextEntry\) && !visible\}/);
  assert.match(native, /accessibilityLabel=\{visible \? "Hide password" : "Show password"\}/);
});
