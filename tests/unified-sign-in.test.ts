import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { digest } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";

const password = "Services-fixture-only-123!";
const phone = "+2348010000042";

test("SIGNIN-01: email and verified phone resolve to the same account and retain legacy login", async () => {
  const f = await fixture();
  try {
    const customer = f.actors.customer;
    const { email } = (await one(f.db, "SELECT email FROM users WHERE id=$1", [
      customer.id,
    ]))!;
    const call = (action: string, input: unknown) =>
      dispatch(action, null, input, f.db);
    await f.db.query("UPDATE users SET contact_phone=$1 WHERE id=$2", [
      phone,
      customer.id,
    ]);
    await f.db.query("UPDATE users SET phone_verified_at=now() WHERE id=$1", [
      customer.id,
    ]);
    for (const [action, input] of [
      ["login", { identifier: " " + email.toUpperCase() + " ", password }],
      ["login", { identifier: "0801 000-0042", password }],
      ["login", { identifier: phone, password }],
      ["login", { email, password }],
      ["phone.login", { phone, password }],
    ] as const) {
      const result = await call(action, input);
      assert.ok(result.token, `${action} should issue a session`);
      assert.equal(
        (await dispatch("me", result.token, {}, f.db)).user.id,
        customer.id,
      );
    }
    await assert.rejects(
      call("login", { identifier: phone, email, password }),
      /Enter your email or phone number/,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SIGNIN-02: unverified and ambiguous numbers fail closed and phone variants share a retry limit", async () => {
  const f = await fixture();
  try {
    const customer = f.actors.customer;
    const login = (identifier: string, supplied = password) =>
      dispatch("login", null, { identifier, password: supplied }, f.db);
    await f.db.query("UPDATE users SET contact_phone=$1 WHERE id=$2", [
      phone,
      customer.id,
    ]);
    assert.equal((await login(phone)).status, 401);
    await f.db.query("UPDATE users SET contact_phone=$1 WHERE id=$2", [
      phone,
      f.actors.technician.id,
    ]);
    await f.db.query(
      "UPDATE users SET phone_verified_at=now() WHERE id=ANY($1::text[])",
      [[customer.id, f.actors.technician.id]],
    );
    assert.equal((await login(phone)).status, 401);
    await f.db.query(
      "UPDATE users SET contact_phone=NULL,phone_verified_at=NULL WHERE id=$1",
      [f.actors.technician.id],
    );
    assert.ok((await login(phone)).token);
    for (let attempt = 0; attempt < 8; attempt++) {
      const result = await login(
        attempt % 2 ? "0801 000 0042" : phone,
        "Wrong-pass",
      );
      assert.equal(result.status, 401);
    }
    assert.equal((await login("2348010000042")).status, 429);
    assert.equal(
      (await dispatch("phone.login", null, { phone, password }, f.db)).status,
      401,
    );
  } finally {
    await f.db.close?.();
  }
});

test("SIGNIN-03: verified phone cannot bypass field role or temporary password requirements", async () => {
  const f = await fixture();
  try {
    const technician = f.actors.technician;
    await f.db.query("UPDATE users SET contact_phone=$1 WHERE id=$2", [
      phone,
      technician.id,
    ]);
    await f.db.query(
      "UPDATE users SET phone_verified_at=now(),verified=true,temporary_password_expires_at=now()+interval '1 hour' WHERE id=$1",
      [technician.id],
    );
    const input = { identifier: phone, password };
    assert.equal(
      (await dispatch("driver.login", null, input, f.db)).status,
      403,
    );
    assert.deepEqual(await dispatch("technician.login", null, input, f.db), {
      passwordChangeRequired: true,
    });
    const result = await dispatch(
      "technician.login",
      null,
      { ...input, newPassword: "Replacement-signin-8" },
      f.db,
    );
    assert.equal(result.role, "technician");
    assert.equal(
      (
        await one(
          f.db,
          "SELECT technician_service_only FROM sessions WHERE id=$1",
          [digest(result.token)],
        )
      )?.technician_service_only,
      true,
    );
    assert.equal((await dispatch("login", null, input, f.db)).status, 401);
  } finally {
    await f.db.close?.();
  }
});
