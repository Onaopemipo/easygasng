import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { assertRequestOrigin } from "../apps/web/lib/request-origin";
test("ORIGIN-01: JSON and media accept same-port local aliases but reject cross-site, cross-port and malformed origins", () => {
  const req = (origin: string) =>
    new NextRequest("http://127.0.0.1:3004/api/media", {
      method: "POST",
      headers: { origin },
    });
  const local = { production: false, appUrl: undefined };
  assert.doesNotThrow(() =>
    assertRequestOrigin(req("http://127.0.0.1:3004"), local),
  );
  assert.doesNotThrow(() =>
    assertRequestOrigin(req("http://localhost:3004"), local),
  );
  for (const origin of [
    "https://evil.example",
    "http://localhost:3005",
    "null",
  ])
    assert.throws(() => assertRequestOrigin(req(origin), local));
});
test("ORIGIN-02: production never enables loopback aliases and requires the configured exact origin", () => {
  const req = (origin: string) =>
    new NextRequest("https://easygas.example/api/media", {
      method: "POST",
      headers: { origin },
    });
  assert.throws(() =>
    assertRequestOrigin(req("https://easygas.example"), {
      production: true,
      appUrl: undefined,
    }),
  );
  assert.doesNotThrow(() =>
    assertRequestOrigin(req("https://easygas.example"), {
      production: true,
      appUrl: "https://easygas.example",
    }),
  );
  assert.throws(() =>
    assertRequestOrigin(req("http://localhost:3004"), {
      production: true,
      appUrl: "https://easygas.example",
    }),
  );
});
