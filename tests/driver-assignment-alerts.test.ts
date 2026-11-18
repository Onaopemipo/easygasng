import test from "node:test";
import assert from "node:assert/strict";
import {
  assignmentActorBranch,
  pendingAssignmentAlerts,
  currentAlertOrder,
  assignmentNotification,
  readAlertLedger,
} from "../packages/business-rules/src/driver-assignment-alerts";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
const orderId = "11111111-1111-4111-8111-111111111111",
  attemptId = "22222222-2222-4222-8222-222222222222";
const row = () => ({
  id: orderId,
  reference: "EG-ALERT-QA",
  driver_id: "driver",
  branch_id: "lagos",
  status: "assigned",
  tracking_version: 3,
  assignment_response_open: true,
  attempt: { id: attemptId, driver_id: "driver", state: "assigned" },
});
test("DAPP-ELIGIBILITY: alert candidates exclude foreign, expired, answered, malformed, closed and stale attempts", () => {
  assert.equal(assignmentActorBranch({ branchId: "lagos" }), "lagos");
  assert.equal(assignmentActorBranch({ branch_id: "lagos" }), "lagos");
  assert.equal(
    assignmentActorBranch({ branchId: "lagos", branch_id: "other" }),
    "",
  );
  const valid = row(),
    list = [valid];
  const [a] = pendingAssignmentAlerts(list, [], "driver", "lagos");
  assert.ok(a);
  assert.equal(currentAlertOrder(a, list, [], "driver", "lagos"), valid);
  for (const change of [
    { driver_id: "other" },
    { attempt: { id: attemptId, driver_id: "other", state: "assigned" } },
    { branch_id: "other" },
    { status: "out_for_delivery" },
    { assignment_response_open: false },
    { tracking_version: null },
    { tracking_version: -1 },
    { attempt: { id: "bad", state: "assigned" } },
    { attempt: { id: attemptId, state: "picked_up" } },
  ])
    assert.equal(
      pendingAssignmentAlerts([{ ...row(), ...change }], [], "driver", "lagos")
        .length,
      0,
    );
  for (const decision of ["acknowledged", "rejected"])
    assert.equal(
      pendingAssignmentAlerts(
        list,
        [{ order_id: orderId, decision }],
        "driver",
        "lagos",
      ).length,
      0,
    );
  assert.equal(
    currentAlertOrder(
      a,
      [{ ...row(), tracking_version: 4 }],
      [],
      "driver",
      "lagos",
    ),
    null,
  );
  assert.equal(
    currentAlertOrder(
      a,
      [
        {
          ...row(),
          attempt: {
            id: "33333333-3333-4333-8333-333333333333",
            state: "assigned",
          },
        },
      ],
      [],
      "driver",
      "lagos",
    ),
    null,
  );
  assert.equal(currentAlertOrder(a, [], [], "driver", "lagos"), null);
  assert.deepEqual(list, [row()]);
});
test("DAPP-PRIVACY: lock-screen payload has reference and opaque scoped IDs; dedupe persists per attempt without contact, code or payment data", () => {
  const sensitive = {
    ...row(),
    address: { phone: "08012345678", street: "Private Street" },
    delivery_code: "999999",
    total_kobo: 123400,
  };
  const [a] = pendingAssignmentAlerts([sensitive], [], "driver", "lagos");
  const payload = assignmentNotification(a, "actor-origin-branch-digest");
  assert.equal(payload.sound, "default");
  assert.deepEqual(Object.keys(payload.data).sort(), [
    "attemptId",
    "kind",
    "orderId",
    "scope",
  ]);
  assert.doesNotMatch(
    JSON.stringify(payload),
    /08012345678|Private Street|999999|123400/,
  );
  const ledger = readAlertLedger(JSON.stringify([a.key, "bad", 7]));
  assert.deepEqual(ledger, [a.key]);
  assert.equal(new Set(ledger).has(a.key), true);
  assert.deepEqual(readAlertLedger("{bad"), []);
  assert.deepEqual(readAlertLedger("{}"), []);
  assert.equal(
    new Set(ledger).has(orderId + ".33333333-3333-4333-8333-333333333333"),
    false,
  );
});
test("DAPP-ACK: real assigned records drive popup eligibility; explicit canonical response records once and cannot change pickup/payment or acknowledge foreign/stale/expired assignments", async () => {
  const f = await fixture();
  try {
    const o = await f.assigned();
    await f.call("driver", "driver.restrict", {});
    assert.equal(
      assignmentActorBranch((await f.call("driver", "me")).user),
      "lagos",
    );
    const list = await f.call("driver", "orders", { active: "1" }),
      snapshot = await f.call("driver", "driver.snapshot");
    const [a] = pendingAssignmentAlerts(
      list,
      snapshot.responses,
      f.actors.driver.id,
      "lagos",
    );
    assert.equal(a.orderId, o.id);
    // Seeing a notification and building an OS payload never records a dispatch response.
    assignmentNotification(a, "test-scope");
    assert.equal(
      (await f.call("driver", "driver.snapshot")).responses[0].decision,
      null,
    );
    const reason = "Explicit synthetic driver assignment alert acknowledgement";
    const input = {
      orderId: o.id,
      version: a.version,
      decision: "acknowledged",
      reason,
      operationKey: id(),
    };
    await assert.rejects(
      () =>
        f.call("driver", "dispatch.respond", {
          ...input,
          version: a.version - 1,
        }),
      /changed/i,
    );
    await assert.rejects(
      () => f.call("owner", "dispatch.respond", input),
      /allow|permission|role|forbidden/i,
    );
    await f.db.query(
      "UPDATE orders SET delivery_code_expires_at=now()-interval '1 minute' WHERE id=$1",
      [o.id],
    );
    await assert.rejects(
      () => f.call("driver", "dispatch.respond", input),
      /expired/i,
    );
    await f.db.query(
      "UPDATE orders SET delivery_code_expires_at=now()+interval '1 hour' WHERE id=$1",
      [o.id],
    );
    await f.call("driver", "dispatch.respond", input);
    await f.call("driver", "dispatch.respond", input);
    const after = await f.call("driver", "orders", { active: "1" }),
      snap = await f.call("driver", "driver.snapshot");
    assert.equal(snap.responses[0].decision, "acknowledged");
    assert.equal(
      pendingAssignmentAlerts(
        after,
        snap.responses,
        f.actors.driver.id,
        "lagos",
      ).length,
      0,
    );
    assert.equal(after[0].status, "assigned");
    assert.equal(after[0].attempt.state, "assigned");
    assert.equal(after[0].payment_status, list[0].payment_status);
    assert.equal(
      (
        await f.db.query(
          "SELECT id FROM dispatch_responses WHERE attempt_id=$1",
          [a.attemptId],
        )
      ).rows.length,
      1,
    );
  } finally {
    await f.db.close?.();
  }
});

test("DAPP-CONFIG: notification/chime native modules link in all shells; packaged PCM cue is short and recording/background audio stay disabled", async () => {
  const { readFile } = await import("node:fs/promises");
  const base = JSON.parse(await readFile("apps/mobile/package.json", "utf8"));
  for (const file of [
    "apps/mobile/driver/package.json",
    "apps/mobile/technician/package.json",
  ]) {
    const shell = JSON.parse(await readFile(file, "utf8"));
    for (const name of ["expo-notifications", "expo-audio"])
      assert.equal(shell.dependencies[name], base.dependencies[name]);
  }
  const config = JSON.parse(await readFile("apps/mobile/app.json", "utf8"));
  const audio = config.expo.plugins.find(
    (p: any) => Array.isArray(p) && p[0] === "expo-audio",
  )[1];
  assert.deepEqual(audio, {
    microphonePermission: false,
    recordAudioAndroid: false,
    enableBackgroundPlayback: false,
    enableBackgroundRecording: false,
  });
  const wav = await readFile("apps/mobile/assets/driver-assignment.wav");
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt16LE(20), 1);
  assert.equal(wav.readUInt16LE(22), 1);
  assert.equal(wav.readUInt16LE(34), 16);
  const duration = wav.readUInt32LE(40) / wav.readUInt32LE(28);
  assert.ok(duration > 0.5 && duration < 2);
  let energy = 0;
  for (let i = 44; i < wav.length; i += 2)
    energy += (wav.readInt16LE(i) / 32768) ** 2;
  assert.ok(
    Math.sqrt(energy / ((wav.length - 44) / 2)) > 0.04,
    "cue contains an audible-level PCM signal",
  );
});
