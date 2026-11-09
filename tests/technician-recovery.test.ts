import test from "node:test";
import assert from "node:assert/strict";
import {
  technicianReplayCheck,
  reconcileTechnicianRecords,
  serviceDraftFingerprint,
  type ServiceRecoveryRecord,
} from "../packages/business-rules/src/technician-recovery";
import { fixture, begin } from "./helpers/service-fixture";
import { actor } from "../apps/web/lib/auth";
import { attachServicePhoto } from "../apps/web/lib/service-photos";
const user = "technician-fixture",
  booking = {
    id: "job",
    technician_id: user,
    version: 7,
    status: "in_progress",
  };
const record = (
  id = "one",
  action = "booking.assessment.save",
): ServiceRecoveryRecord => ({
  id,
  userId: user,
  operationKey: "key-" + id,
  tripId: "booking:job",
  kind: "status",
  payload: {
    technicianId: user,
    serviceAction: action,
    bookingVersion: 7,
    input: { bookingId: "job", version: 7, reason: "Fixture assessment notes" },
  },
});
test("FIELD-RECOVERY-01: interrupted acknowledgement recovers committed receipt without a second mutation", async () => {
  let effects = 0,
    committed = false,
    failAck = true;
  const retained = new Set(["one"]);
  const e = record();
  const api = async (a: string) =>
    a.startsWith("booking.operation")
      ? { status: committed ? "COMMITTED" : "NOT_FOUND" }
      : a.startsWith("bookings")
        ? [booking]
        : (effects++, (committed = true), { ok: true });
  const io = {
    api,
    ack: async (r: ServiceRecoveryRecord) => {
      if (failAck) throw new Error("Simulated local storage write failure");
      retained.delete(r.id);
    },
    review: async () => {},
  };
  const first = await reconcileTechnicianRecords([e], user, io);
  assert.equal(first.sent, 0);
  assert.equal(effects, 1);
  assert.ok(retained.has("one"));
  failAck = false;
  const second = await reconcileTechnicianRecords([e], user, io);
  assert.equal(second.sent, 1);
  assert.equal(effects, 1);
  assert.equal(retained.size, 0);
});
test("FIELD-RECOVERY-02: changed assignment/version, closed job, cross-account and work authorisation never replay", async () => {
  for (const b of [
    null,
    { ...booking, technician_id: "other" },
    { ...booking, version: 8 },
    { ...booking, status: "completed" },
  ])
    assert.throws(() =>
      technicianReplayCheck(
        user,
        {
          action: "booking.assessment.save",
          bookingId: "job",
          version: 7,
          input: { bookingId: "job" },
        },
        b,
      ),
    );
  for (const action of [
    "booking.work.start",
    "booking.report",
    "booking.quote",
    "wallet.topup",
  ])
    assert.throws(
      () =>
        technicianReplayCheck(
          user,
          { action, bookingId: "job", version: 7, input: { bookingId: "job" } },
          booking,
        ),
      /online review/,
    );
  let mutations = 0;
  const records = [record(), record("two")],
    reviewed: string[] = [];
  const r = await reconcileTechnicianRecords(records, user, {
    api: async (a) =>
      a.startsWith("booking.operation")
        ? { status: "NOT_FOUND" }
        : a.startsWith("bookings")
          ? [{ ...booking, version: 8 }]
          : (mutations++, {}),
    ack: async () => {
      throw new Error("Must retain");
    },
    review: async (e) => {
      reviewed.push(e.id);
    },
  });
  assert.equal(mutations, 0);
  assert.deepEqual(reviewed, ["one"]);
  assert.equal(r.conflicts.length, 1);
  const wrong = record();
  wrong.userId = "other";
  assert.equal(
    (
      await reconcileTechnicianRecords([wrong], user, {
        api: async () => {
          throw new Error("Must not read another account");
        },
        ack: async () => {},
        review: async () => {},
      })
    ).sent,
    0,
  );
});
test("FIELD-RECOVERY-03: expired credentials stop replay and retain later records; stable fingerprints ignore transport operation keys", async () => {
  let reads = 0,
    acks = 0;
  const r = await reconcileTechnicianRecords([record(), record("two")], user, {
    api: async () => {
      reads++;
      throw Object.assign(new Error("Expired"), { status: 401 });
    },
    ack: async () => {
      acks++;
    },
    review: async () => {},
  });
  assert.equal(reads, 1);
  assert.equal(acks, 0);
  assert.equal(r.sent, 0);
  assert.equal(
    serviceDraftFingerprint("booking.report", {
      a: 1,
      b: 2,
      operationKey: "first",
    }),
    serviceDraftFingerprint("booking.report", {
      b: 2,
      operationKey: "second",
      a: 1,
    }),
  );
});
test("FIELD-PHOTO-01: queued photograph version is rechecked in the canonical locked booking before bytes or history change", async () => {
  const f = await fixture();
  try {
    const b = await begin(f),
      technician = await actor(f.db, f.actors.technician.token),
      current = (await f.call("technician", "bookings"))[0];
    const foreign = await actor(f.db, f.actors.commercial.token);
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          attachServicePhoto(
            tx,
            foreign,
            b.id,
            new Uint8Array(),
            "Foreign stale photo",
            true,
            current.version - 1,
          ),
        ),
      (e) => (e as any).status === 403 || (e as any).status === 404,
    );
    await assert.rejects(
      () =>
        f.db.transaction((tx) =>
          attachServicePhoto(
            tx,
            technician,
            b.id,
            new Uint8Array(),
            "Synthetic stale photo",
            true,
            current.version - 1,
          ),
        ),
      /booking changed/,
    );
    assert.equal(
      Number(
        (
          await f.db.query(
            "SELECT count(*) n FROM media_assets WHERE booking_id=$1",
            [b.id],
          )
        ).rows[0].n,
      ),
      0,
    );
  } finally {
    await f.db.close?.();
  }
});

test("FIELD-SCOPE-01: production field roles cannot use legacy tokens to bypass scoped financial and unsafe completion boundaries", async () => {
  const f = await fixture();
  const previous = process.env.NODE_ENV;
  try {
    await f.db.query(
      "UPDATE sessions SET technician_service_only=false WHERE user_id=$1",
      [f.actors.technician.id],
    );
    process.env.NODE_ENV = "production";
    const u = await actor(f.db, f.actors.technician.token);
    assert.equal(u.technician_service_only, true);
    await assert.rejects(
      () => f.call("technician", "finance.summary"),
      /limited to assigned technician/,
    );
    await assert.rejects(
      () => f.call("technician", "wallet.topup", {}),
      /limited to assigned technician/,
    );
    // The same authority rule applies to an already issued legacy driver token.
    const { issueSession, id, hashPassword } = await import(
      "../apps/web/lib/auth"
    );
    const driver = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic legacy driver',$2,$3,'driver','lagos')",
      [driver, driver + "@example.test", hashPassword("Fixture-only-123!")],
    );
    const token = await issueSession(f.db, driver),
      d = await actor(f.db, token);
    assert.equal(d.driver_delivery_only, true);
    const { dispatch } = await import("../apps/web/lib/service");
    await assert.rejects(
      () => dispatch("delivery.complete", token, {}, f.db),
      /limited to delivery/,
    );
    await assert.rejects(
      () => dispatch("wallet.topup", token, {}, f.db),
      /limited to delivery/,
    );
    assert.equal(
      Number(
        (await f.db.query("SELECT count(*) n FROM wallet_entries")).rows[0].n,
      ),
      0,
    );
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    await f.db.close?.();
  }
});
