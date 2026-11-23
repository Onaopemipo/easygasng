import test from "node:test";
import assert from "node:assert/strict";
import { singleFlightRefresh } from "../packages/business-rules/src/native-order-refresh";

test("slow initial order read survives repeated polling and settles before the next read", async () => {
  let calls = 0,
    displayed: string | null = null;
  let finish!: (value: string) => void;
  const refresh = singleFlightRefresh(async (initial) => {
    calls++;
    const value = await new Promise<string>((resolve) => {
      finish = resolve;
    });
    displayed = value;
    return { initial, value };
  });
  const first = refresh(true);
  assert.equal(refresh(), first);
  assert.equal(refresh(), first);
  assert.equal(calls, 1);
  finish("authoritative orders");
  assert.deepEqual(await first, {
    initial: true,
    value: "authoritative orders",
  });
  assert.equal(displayed, "authoritative orders");
  const next = refresh();
  assert.equal(calls, 2);
  finish("updated orders");
  await next;
  assert.equal(displayed, "updated orders");
});

test("a failed read releases the polling lock so a deliberate retry can recover", async () => {
  let calls = 0;
  const refresh = singleFlightRefresh(async () => {
    if (++calls === 1) throw new Error("offline");
    return "recovered";
  });
  await assert.rejects(refresh(), /offline/);
  assert.equal(await refresh(), "recovered");
  assert.equal(calls, 2);
});
