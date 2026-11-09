import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
const password = "Services-fixture-only-123!";
const token = (url: string) => url.split("#token=")[1];
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
    assert.ok(invitation.invitationUrl.includes("/accept-invitation#token="));
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
    const renewed = await f.call("administrator", "staff.invitation.resend", {
      id: invitation.invitationId,
    });
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          token: token(invitation.invitationUrl),
          password,
        }),
      /no longer valid/,
    );
    await f.call("customer", "invitation.accept", {
      token: token(renewed.invitationUrl),
      password,
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
      role: "sales",
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
      "sales",
    );
    const request = await f.call("owner", "staff.access.request", {
      userId: person.id,
      role: "sales",
      branchId: "lagos",
      reason: "Colleague joins the branch sales team",
    });
    assert.ok(request.id);
    assert.equal(
      (await one(f.db, "SELECT role FROM users WHERE id=$1", [person.id]))!
        .role,
      "sales",
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
    await assert.rejects(
      () =>
        f.call("administrator", "staff.edit", {
          userId: f.actors.owner.id,
          name: "Changed Owner",
          reason: "Attempt to modify protected owner",
        }),
      /outside staff/,
    );
    await assert.rejects(
      () =>
        f.call("administrator", "staff.suspend", {
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
    await f.call("owner", "staff.invitation.revoke", { id: inv.invitationId });
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          token: token(inv.invitationUrl),
          password,
        }),
      /no longer valid/,
    );
    await f.db.query("INSERT INTO branches(id,name) VALUES ('other','Other')");
    await f.db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.administrator.id,
    ]);
    assert.equal(
      (await f.call("administrator", "staff.manage")).people.length,
      1,
    );
    await assert.rejects(
      () =>
        f.call("administrator", "staff.edit", {
          userId: f.actors.safety_officer.id,
          name: "Wrong Branch",
          reason: "Cross-branch modification attempt",
        }),
      /another branch/,
    );
  } finally {
    await f.db.close?.();
  }
});
test("staff management invitation actions run with restricted runtime grants and moved administrators cannot validate old branch invitations", async () => {
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
    const renewed = await f.call("administrator", "staff.invitation.resend", {
      id: i.invitationId,
    });
    await f.call("owner", "staff.invitation.revoke", { id: i.invitationId });
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          token: token(renewed.invitationUrl),
          password,
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
    await db.exec("RESET ROLE");
    await db.query("INSERT INTO branches(id,name) VALUES ('other','Other')");
    await db.query("UPDATE users SET branch_id='other' WHERE id=$1", [
      f.actors.administrator.id,
    ]);
    await db.exec("SET ROLE easygas_server");
    await assert.rejects(
      () =>
        f.call("customer", "invitation.accept", {
          token: token(moved.invitationUrl),
          password,
        }),
      /no longer valid/,
    );
  } finally {
    await db.close?.();
  }
});
