import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { signOutMobileSession } from "../packages/business-rules/src/mobile-sign-out";
import { fixture } from "./helpers/order-tracking-fixture";
function setup(extra: any = {}) {
  let visible = true,
    stored = "synthetic-token",
    queue = "encrypted-private-evidence";
  const events: string[] = [];
  let result: any;
  return {
    events,
    get visible() {
      return visible;
    },
    get stored() {
      return stored;
    },
    get queue() {
      return queue;
    },
    get result() {
      return result;
    },
    run: () =>
      signOutMobileSession({
        endLocalSession: () => {
          visible = false;
          events.push("local-end");
        },
        deleteStoredSession: async () => {
          stored = "";
          events.push("delete");
        },
        emptyStoredSession: async () => {
          stored = "";
          events.push("empty");
        },
        storageSettled: (ok) => {
          events.push("storage:" + ok);
        },
        stopLocation: async () => {
          events.push("gps");
        },
        revokeSession: async () => {
          events.push("revoke");
        },
        timeoutMs: 20,
        ...extra,
      }).then((r) => (result = r)),
  };
}
test("SO-ORDER session visibility ends synchronously before GPS/network work; only auth storage is removed, and normal app entry is retained", async () => {
  const f = setup();
  const p = f.run();
  assert.equal(f.visible, false);
  await p;
  assert.equal(f.events[0], "local-end");
  assert.equal(f.stored, "");
  assert.equal(f.queue, "encrypted-private-evidence");
  assert.deepEqual(f.result, {
    storedSessionCleared: true,
    locationStopped: true,
    serverRevoked: true,
  });
  const source = await readFile("apps/mobile/App.tsx", "utf8");
  assert.match(
    source,
    /revokeSession: \(signal\) => api\("logout", \{\}, endingSession, signal\)/,
  );
  assert.match(source, /sessionRef.current = null/);
  assert.match(source, /accountRef.current = null/);
  const pkg = JSON.parse(await readFile("apps/mobile/package.json", "utf8"));
  assert.equal(pkg.main, "index.ts");
  assert.match(
    await readFile("apps/mobile/index.ts", "utf8"),
    /React.createElement\(App\)/,
  );
});
test("SO-OFFLINE GPS rejection and network rejection do not retain the local session", async () => {
  const f = setup({
    stopLocation: async () => {
      throw Error("unsupported Expo module");
    },
    revokeSession: async () => {
      throw Error("offline");
    },
  });
  await f.run();
  assert.equal(f.visible, false);
  assert.equal(f.stored, "");
  assert.deepEqual(f.result, {
    storedSessionCleared: true,
    locationStopped: false,
    serverRevoked: false,
  });
});
test("SO-DEADLINE a stalled/abort-ignoring server and GPS settle boundedly without blocking local storage cleanup", async () => {
  let signal: AbortSignal | undefined;
  const f = setup({
    stopLocation: () => new Promise(() => {}),
    revokeSession: (s: AbortSignal) => {
      signal = s;
      return new Promise(() => {});
    },
  });
  const p = f.run();
  await new Promise((r) => setTimeout(r, 1));
  assert.equal(f.visible, false);
  assert.equal(f.stored, "");
  assert.ok(f.events.includes("storage:true"));
  await p;
  assert.equal(signal?.aborted, true);
  assert.equal(f.result.serverRevoked, false);
});
test("SO-STORAGE failed key deletion falls back to an empty stored session so cold-start truthiness cannot restore it", async () => {
  const f = setup({
    deleteStoredSession: async () => {
      throw Error("delete failed");
    },
  });
  await f.run();
  assert.equal(f.stored, "");
  assert.ok(f.events.includes("empty"));
  assert.equal(f.result.storedSessionCleared, true);
});
test("SO-STORAGE-FAIL both secure storage failures are reported as incomplete instead of claiming persistent sign-out", async () => {
  let state: any;
  const f = setup({
    deleteStoredSession: async () => {
      throw Error("unavailable");
    },
    emptyStoredSession: async () => {
      throw Error("unavailable");
    },
    storageSettled: (ok: boolean) => {
      state = ok;
    },
  });
  await f.run();
  assert.equal(f.visible, false);
  assert.equal(state, false);
  assert.equal(f.result.storedSessionCleared, false);
});
test("SO-SERVER real authenticated driver sign-out revokes the server session once; replay cannot access me or driver workspace", async () => {
  const f = await fixture();
  try {
    await f.call("driver", "driver.restrict");
    assert.ok((await f.call("driver", "me")).user);
    await f.call("driver", "logout");
    await assert.rejects(
      () => f.call("driver", "me"),
      (e: any) => e.status === 401,
    );
    await assert.rejects(
      () => f.call("driver", "driver.snapshot"),
      (e: any) => e.status === 401,
    );
    const rows = (
      await f.db.query("SELECT revoked_at FROM sessions WHERE user_id=$1", [
        f.actors.driver.id,
      ])
    ).rows;
    assert.ok(rows.every((r: any) => r.revoked_at));
  } finally {
    await f.db.close?.();
  }
});
