import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id, issueSession } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
import { dispatch } from "../apps/web/lib/service";
import { deliverTransactionalMail, type MailTransport } from "../apps/web/lib/transactional-mail";

process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "8".repeat(64);
const fixturePassword = "Services-fixture-only-123!";
type Message = Parameters<MailTransport["send"]>[0];

function emailedToken(message: Message) {
  return message.body.match(/#token=([a-f0-9]{64})/)![1];
}
function emailedPassword(message: Message) {
  return message.body.match(/Temporary password: ([\w-]+)/)![1];
}

test("ONBOARD-01: staff email acceptance, replacement before access and replay rejection", async () => {
  const f = await fixture();
  try {
    const email = id() + "@example.test";
    const input = { name: "Invited Colleague", email, branchId: "lagos" };
    const call = (action: string, data: unknown, token: string | null = null) => dispatch(action, token, data, f.db);
    await assert.rejects(f.call("customer", "staff.invite", input), /permission/i);
    await assert.rejects(f.call("administrator", "staff.invite", input), /verify your password/i);
    await f.call("administrator", "reauth", { password: fixturePassword });
    const result = await f.call("administrator", "staff.invite", input);
    const sent: Message[] = [];
    const transport = { async send(message: Message) { sent.push(message); } };
    await deliverTransactionalMail(f.db, transport);
    const invitation = sent.find(message => message.recipient === email)!;
    const password = emailedPassword(invitation), token = emailedToken(invitation);
    const row = await one(f.db, "SELECT body FROM message_outbox WHERE recipient=$1", [email]);
    assert.match(row!.body, /^v1:/);
    assert.ok(!row!.body.includes(password) && !row!.body.includes(token));
    assert.ok(!JSON.stringify(result).includes(password) && !JSON.stringify(result).includes(token));
    assert.equal((await call("register", { email, name: input.name, password })).status, 409);
    assert.equal((await call("login", { email, password })).status, 401);
    await assert.rejects(call("invitation.accept", { token, password: fixturePassword }), /does not match/);
    await call("invitation.accept", { token, password });
    await assert.rejects(call("invitation.accept", { token, password }), /no longer valid/);
    assert.deepEqual(await call("login", { email, password }), { passwordChangeRequired: true });
    const user = await one(f.db, "SELECT id,role FROM users WHERE email=$1", [email]);
    assert.equal(user!.role, "customer");
    await assert.rejects(call("me", {}, await issueSession(f.db, user!.id)), /expired/);
    assert.equal((await call("login", { email, password, newPassword: password })).status, 400);
    const newPassword = "New-pass8";
    const [first, second] = await Promise.all([
      call("login", { email, password, newPassword }),
      call("login", { email, password, newPassword }),
    ]);
    assert.equal([first, second].filter(result => result.token).length, 1);
    assert.equal((await call("login", { email, password })).status, 401);
    const session = await call("login", { email, password: newPassword });
    assert.equal((await call("me", {}, session.token)).user.id, user!.id);
  } finally {
    await f.db.close?.();
  }
});

test("ONBOARD-02: admin-created customer must accept and replace the emailed password", async () => {
  const f = await fixture();
  try {
    const email = id() + "@example.test";
    const created = await f.call("owner", "customers.create", { name: "New Customer", email, branchId: "lagos" });
    const sent: Message[] = [];
    await deliverTransactionalMail(f.db, { async send(message) { sent.push(message); } });
    const acceptance = sent.find(message => message.recipient === email)!;
    const password = emailedPassword(acceptance), token = emailedToken(acceptance);
    assert.equal((await dispatch("login", null, { email, password }, f.db)).status, 403);
    await dispatch("account.verify", null, { token }, f.db);
    assert.deepEqual(await dispatch("login", null, { email, password }, f.db), { passwordChangeRequired: true });
    await f.db.query("UPDATE users SET temporary_password_expires_at=now()-interval '1 minute' WHERE id=$1", [created.id]);
    assert.match((await dispatch("login", null, { email, password }, f.db)).authError, /expired/);
    const resetSent: Message[] = [];
    await dispatch("account.recover", null, { email }, f.db);
    await deliverTransactionalMail(f.db, { async send(message) { resetSent.push(message); } });
    const reset = resetSent.find(message => message.recipient === email)!;
    await assert.rejects(dispatch("account.reset", null, { token: emailedToken(reset), password }, f.db), /different/);
    await dispatch("account.reset", null, { token: emailedToken(reset), password: "New-customer8" }, f.db);
    assert.ok((await dispatch("login", null, { email, password: "New-customer8" }, f.db)).token);
  } finally {
    await f.db.close?.();
  }
});

test("ONBOARD-03: recovery covers staff and customers with bounded sends and single-use links", async () => {
  const f = await fixture();
  try {
    for (const role of ["finance", "customer"]) {
      const { id: uid, token: oldSession } = f.actors[role];
      const row = await one(f.db, "SELECT email FROM users WHERE id=$1", [uid]);
      const email = row!.email;
      const recover = (address: string) => dispatch("account.recover", null, { email: address }, f.db);
      const generic = await recover("missing@example.test");
      const firstMessages: Message[] = [];
      assert.deepEqual(await recover(email), generic);
      await deliverTransactionalMail(f.db, { async send(message) { firstMessages.push(message); } });
      const first = emailedToken(firstMessages.find(message => message.recipient === email)!);
      const recovered = await Promise.all(Array.from({ length: 4 }, () => recover(email)));
      assert.ok(recovered.every(response => response.message === generic.message));
      const count = await one(f.db, "SELECT count(*)::int AS count FROM account_challenges WHERE user_id=$1 AND purpose='reset'", [uid]);
      assert.equal(count!.count, 3);
      await assert.rejects(dispatch("account.reset", null, { token: first, password: "Reset-now8" }, f.db), /expired/);
      const finalMessages: Message[] = [];
      await deliverTransactionalMail(f.db, { async send(message) { finalMessages.push(message); } });
      const current = finalMessages.filter(message => message.recipient === email);
      assert.equal(current.length, 1);
      const input = { token: emailedToken(current[0]), password: "Reset-now8" };
      const results = await Promise.allSettled([dispatch("account.reset", null, input, f.db), dispatch("account.reset", null, input, f.db)]);
      assert.equal(results.filter(result => result.status === "fulfilled").length, 1);
      await assert.rejects(dispatch("me", oldSession, {}, f.db), /expired/);
      const signedIn = await dispatch("login", null, { email, password: input.password }, f.db);
      assert.equal(signedIn.role, role);
    }
  } finally {
    await f.db.close?.();
  }
});
