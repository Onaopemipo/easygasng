import test from "node:test";
import assert from "node:assert/strict";
import { assertMobileApiOrigin } from "../packages/business-rules/src/mobile-origin";
test("MOB-API01: local demo permits only loopback HTTP and released clients keep HTTPS and origin validation", () => {
  assert.doesNotThrow(() =>
    assertMobileApiOrigin("http://127.0.0.1:3003", false, true),
  );
  assert.doesNotThrow(() =>
    assertMobileApiOrigin("http://10.0.2.2:3003", false, true),
  );
  assert.doesNotThrow(() =>
    assertMobileApiOrigin("https://easygasng.com", false, false),
  );
  for (const url of [
    "http://127.0.0.1:3003",
    "http://easygasng.com",
    "https://easygasng.com/api",
    "https://user:secret@easygasng.com",
    "https://easygasng.com?token=secret",
    "not-url",
  ])
    assert.throws(() => assertMobileApiOrigin(url, false, false));
  assert.throws(() =>
    assertMobileApiOrigin("http://public.example.test", false, true),
  );
  assert.throws(() =>
    assertMobileApiOrigin("http://127.0.0.1:3003/api", false, true),
  );
});
