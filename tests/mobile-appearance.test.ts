import test from "node:test";
import assert from "node:assert/strict";
import {
  parseMobileAppearance,
  resolveMobileAppearance,
} from "../packages/business-rules/src/mobile-appearance";
test("MUI-01: saved appearance overrides system and corrupt preferences safely follow system", () => {
  assert.equal(resolveMobileAppearance("light", "dark"), "light");
  assert.equal(resolveMobileAppearance("dark", "light"), "dark");
  assert.equal(resolveMobileAppearance("system", "dark"), "dark");
  assert.equal(resolveMobileAppearance("system", null), "light");
  for (const value of [null, undefined, "invalid", {}, "DARK"])
    assert.equal(parseMobileAppearance(value), "system");
  assert.equal(parseMobileAppearance("dark"), "dark");
  assert.equal(parseMobileAppearance("light"), "light");
});
