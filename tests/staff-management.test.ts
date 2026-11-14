import { openMessage } from "../apps/web/lib/channel-messaging";
import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { one, type DB } from "../apps/web/lib/db";
process.env.EASYGAS_MESSAGE_ENCRYPTION_KEY ??= "7".repeat(64);
const password = "Services-fixture-only-123!";
async function invitationCredentials(db: DB, invitationId: string) {
  const row = await one(db, "SELECT body FROM message_outbox WHERE (dedupe_key=$1 OR dedupe_key LIKE $2) AND status='pending'", [
    "invite:" + invitationId,
    "invite:" + invitationId + ":%",
  ]);
  const body = openMessage(row!.body);
  return {
    token: body.match(/#token=([a-f0-9]{64})/)![1],
    password: body.match(/Temporary password: ([\w-]+)/)![1],
  };
}
test("staff invitations are manageable without granting privileges, renew invalidates old links and accepted accounts appear in staff management", async () => {
  const f = await fixture();
  try {
    await f.call("administrator", "reauth", { password });
    const email = id() + "@example.test";
    const invitation = await f.call("administrator", "staff.invite", {
      name: "New Test Colleague",
      email,
      branchId: "lagos",
    });
    assert.equal(invitation.invitationUrl, undefined);
    const originalCredentials = await invitationCredentials(f.db, invitation.invitationId);
    await assert.rejects(
      () =>
        f.call("owner", "staff.invite", {
          name: "Duplicate Colleague",
          email,
          branchId: "lagos",
        }),
      /already exists/,
    );
    assert.ok(
      (await f.call("administrator", "staff.manage")).invitations.some(
        (i: any) => i.id === invitation.invitationId,
      ),
    );
    await f.call("administrator", "staff.invitation.resend", {
      id: invitation.invitationId,
    });
    const renewedCredentials = await invitationCredentials(f.db, invitation.invitationId);
    assert.notEqual(renewedCredentials.password, originalCredentials.password);
    await assert.rejects(
      () => f.call("customer", "invitation.accept", {
        token: renewedCredentials.token,
        password: originalCredentials.password,
      }),
      /does not match/,
    );
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          ...originalCredentials,
        }),
      /no longer valid/,
    );
    await f.call("customer", "invitation.accept", {
      ...renewedCredentials,
    });
    const person = (await f.call("owner", "staff.manage")).people.find(
      (p: any) => p.email === email,
    );
    assert.equal(person.role, "customer");
    await assert.rejects(
      () =>
        f.call("administrator", "staff.invitation.revoke", {
          id: invitation.invitationId,
        }),
      /already been accepted/,
    );
    const adminRequest = await f.call("administrator", "staff.access.request", {
      userId: person.id,
      role: "manager",
      branchId: "lagos",
      reason: "Administrator requests approved sales privileges",
    });
    assert.ok(adminRequest.id);
    assert.ok(
      (await f.call("administrator", "staff.manage")).accessRequests.some(
        (r: any) => r.id === adminRequest.id,
      ),
    );
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [person.id]))!
        .role,
      "customer",
    );
    await assert.rejects(
      () =>
        f.call("administrator", "approval.decide", {
          id: adminRequest.id,
          decision: "approve",
          reason: "Attempt to approve own access request",
        }),
      /permission|own|independent/i,
    );
    await assert.rejects(
      () =>
        f.call("administrator", "staff.access.request", {
          userId: f.actors.administrator.id,
          role: "owner",
          branchId: "lagos",
          reason: "Attempt to change own privileges",
        }),
      /own privileges/,
    );
    for (const reviewer of ["owner", "finance"]) {
      await f.call(reviewer, "approval.decide", {
        id: adminRequest.id,
        decision: "approve",
        reason: "Independent review of administrator access request",
      });
    }
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [person.id]))!
        .role,
      "manager",
    );
    const request = await f.call("owner", "staff.access.request", {
      userId: person.id,
      role: "manager",
      branchId: "lagos",
      reason: "Colleague joins the branch sales team",
    });
    assert.ok(request.id);
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [person.id]))!
        .role,
      "manager",
    );
    await assert.rejects(
      () =>
        f.call("owner", "approval.decide", {
          id: request.id,
          decision: "approve",
          reason: "Cannot approve own staff request",
        }),
      /own|independent/i,
    );
  } finally {
    await f.db.close?.();
  }
});
test("staff edits, suspension, reinstatement and invitation revocation enforce authority, branch and session safeguards", async () => {
  const f = await fixture();
  try {
    await assert.rejects(
      () => f.call("customer", "staff.manage"),
      /permission/,
    );
    await f.call("administrator", "reauth", { password });
    await f.call("administrator", "staff.edit", {
      userId: f.actors.technician.id,
      name: "Updated Technician",
      reason: "Correct the colleague display name",
    });
    assert.equal(
      (await one(f.db, "SELECT name FROM users WHERE id=$1", [
        f.actors.technician.id,
      ]))!.name,
      "Updated Technician",
    );
    await f.call("service_manager", "reauth", { password });
    await assert.rejects(
      () =>
        f.call("service_manager", "staff.edit", {
          userId: f.actors.owner.id,
          name: "Changed Owner",
          reason: "Attempt to modify protected owner",
        }),
      /outside staff/,
    );
    await assert.rejects(
      () =>
        f.call("service_manager", "staff.suspend", {
          userId: f.actors.technician.id,
          reason: "Unauthorised suspension attempt",
        }),
      /permission/,
    );
    await f.call("owner", "staff.suspend", {
      userId: f.actors.technician.id,
      reason: "Suspend for documented staff review",
    });
    await assert.rejects(() => f.call("technician", "me"), /expired/);
    await f.call("owner", "staff.reinstate", {
      userId: f.actors.technician.id,
      reason: "Staff review completed and approved",
    });
    assert.equal(
      (await one(f.db, "SELECT active FROM users WHERE id=$1", [
        f.actors.technician.id,
      ]))!.active,
      true,
    );
    await assert.rejects(() => f.call("technician", "me"), /expired/);
    await assert.rejects(
      () =>
        f.call("owner", "staff.reinstate", {
          userId: f.actors.owner.id,
          reason: "Attempt protected owner reinstatement",
        }),
      /eligible/,
    );
    const inv = await f.call("owner", "staff.invite", {
      name: "Revoked Test Colleague",
      email: id() + "@example.test",
      branchId: "lagos",
    });
    const revokedCredentials = await invitationCredentials(f.db, inv.invitationId);
    await f.call("owner", "staff.invitation.revoke", { id: inv.invitationId });
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          ...revokedCredentials,
        }),
      /no longer valid/,
    );
    await f.db.query("INSERT INTO branches(id,name) VALUES ('other','Other')");
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.administrator.id,
    ]);
    assert.ok((await f.call("administrator", "staff.manage")).people.length > 1);
    await f.call("administrator", "staff.edit", { userId: f.actors.safety_officer.id, name: "Cross Branch Owner", reason: "Business-wide access can edit another branch" });
  } finally {
    await f.db.close?.();
  }
});
test("staff management invitation actions run with restricted runtime grants and business-wide administrators retain access to previous branch invitations", async () => {
  const { readFile } = await import("node:fs/promises");
  const { createDatabase } = await import("../apps/web/lib/db");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec(
      "SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server",
    );
    const f = await fixture(db);
    await f.call("administrator", "reauth", { password });
    const i = await f.call("administrator", "staff.invite", {
      name: "Restricted Runtime Colleague",
      email: id() + "@example.test",
      branchId: "lagos",
    });
    await f.call("administrator", "staff.invitation.resend", {
      id: i.invitationId,
    });
    const revokedCredentials = await invitationCredentials(f.db, i.invitationId);
    await f.call("owner", "staff.invitation.revoke", { id: i.invitationId });
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          ...revokedCredentials,
        }),
      /no longer valid/,
    );
    await f.call("administrator", "staff.edit", {
      userId: f.actors.technician.id,
      name: "Restricted Profile Edit",
      reason: "Restricted runtime profile update proof",
    });
    await f.call("owner", "staff.suspend", {
      userId: f.actors.technician.id,
      reason: "Restricted runtime suspension proof",
    });
    await f.call("owner", "staff.reinstate", {
      userId: f.actors.technician.id,
      reason: "Restricted runtime reinstatement proof",
    });
    const moved = await f.call("administrator", "staff.invite", {
      name: "Moved Branch Invitation",
      email: id() + "@example.test",
      branchId: "lagos",
    });
    const movedCredentials = await invitationCredentials(f.db, moved.invitationId);
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO branches(id,name) VALUES ('other','Other')");
    await db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.administrator.id,
    ]);
    await db.exec("SET ROLE easygas_server");
    await f.call("customer", "invitation.accept", movedCredentials);
  } finally {
    await db.close?.();
  }
});

test("STAFF-INV-01/02: selected privileges are reviewed, never applied before independent approval, and enforced after activation", async () => {
  const { createDatabase } = await import("../apps/web/lib/db");
  const { readFile } = await import("node:fs/promises");
  const db = await createDatabase("memory://");
  try {
    await db.exec(await readFile("database/bootstrap.sql", "utf8"));
    await db.exec("SET search_path TO easygas_private,pg_catalog; SET ROLE easygas_server");
    const f = await fixture(db);
    await f.call("administrator", "reauth", { password });
    const data = { name: "New Finance Colleague", email: id() + "@example.test", branchId: "lagos" };
    const changes = [
      { privilege: "customers.view", effect: "grant" },
      { privilege: "audit.view", effect: "deny" },
    ];
    const invite = await f.call("administrator", "staff.invite", { ...data, access: { role: "finance", changes } });
    assert.equal((await f.call("owner", "staff.manage")).invitations.find((row: any) => row.id === invite.invitationId).requested_role, "finance");
    const creds = await invitationCredentials(f.db, invite.invitationId);
    await f.call("customer", "invitation.accept", creds);
    await assert.rejects(f.call("customer", "invitation.accept", creds), /no longer valid/);
    const { id: uid } = (await one(f.db, "SELECT id FROM users WHERE email=$1", [data.email]))!;
    const requestId = (await one(f.db, "SELECT access_request_id FROM staff_invitations WHERE id=$1", [invite.invitationId]))!.access_request_id;
    const check = async (role: string, expected: number) => {
      assert.equal((await one(f.db, "SELECT role FROM users WHERE id=$1", [uid]))!.role, role);
      assert.equal((await f.db.query("SELECT privilege FROM staff_privilege_overrides WHERE user_id=$1", [uid])).rows.length, expected);
    };
    await check("customer", 0);
    const approval = (await f.call("finance", "approvals")).find((r: any) => r.id === requestId);
    assert.deepEqual(approval.invitation_access, { name: data.name, changes });
    const decision = { id: requestId, decision: "approve", reason: "Independent staff invitation review" };
    await assert.rejects(f.call("administrator", "approval.decide", decision), /independent|own/i);
    await f.call("owner", "approval.decide", decision);
    await check("customer", 0);
    await f.call("finance", "approval.decide", decision);
    await check("finance", 2);
    const { dispatch } = await import("../apps/web/lib/service");
    const session = await dispatch("login", null, { email: data.email, password: creds.password, newPassword: "Test-replacement8" }, f.db);
    assert.ok(session.token);
    assert.ok((await dispatch("customers.manage", session.token, {}, f.db)).customers);
    await assert.rejects(dispatch("audit", session.token, {}, f.db), /revoked/i);
    await assert.rejects(db.query("UPDATE staff_invitations SET requested_access=NULL WHERE id=$1", [invite.invitationId]), /permission denied/i);
  } finally {
    await db.close?.();
  }
});

test("STAFF-INV-02: inviting owners cannot attach protected grants to driver roles or provide arbitrary privileges", async () => {
  const f = await fixture();
  try {
    const data = { name: "Invited Driver", email: id() + "@example.test", branchId: "lagos" };
    for (const privilege of ["finance.manage", "dispatch.manage", "no.such.privilege"]) {
      await assert.rejects(f.call("owner", "staff.invite", {
        ...data, access: { role: "driver", changes: [{ privilege, effect: "grant" }] },
      }), /cannot be granted|recognised/i);
    }
    assert.equal(await one(f.db, "SELECT id FROM staff_invitations WHERE email=$1", [data.email]), undefined);
  } finally {
    await f.db.close?.();
  }
});
