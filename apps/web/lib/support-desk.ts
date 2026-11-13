import { createHash } from "node:crypto";
import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { enforceStaffPrivilege } from "./staff-privileges";
import { audit, notify } from "./governance";
import { prepareImage } from "./media";
import { supportDueAt, supportSlaPolicy, supportSlaState } from "./support-sla";
export const isSupportCustomer = (user: Actor) =>
  ["customer", "commercial"].includes(user.role);
export async function supportTicket(
  tx: SQL,
  user: Actor,
  requestId: string,
  write = false,
) {
  if (user.driver_delivery_only || user.technician_service_only)
    throw new AppError(403, "This session is limited to assigned field work.");
  enforceStaffPrivilege(user, "support.detail");
  if (write) enforceStaffPrivilege(user, "support.update");
  const row = await one(
    tx,
    "SELECT * FROM support_requests WHERE id=$1" + (write ? " FOR UPDATE" : ""),
    [requestId],
  );
  if (!row || (isSupportCustomer(user) && row.customer_id !== user.id))
    throw new AppError(404, "Support request not found.");
  if (!isSupportCustomer(user))
    allow(user, ["owner", "manager"], row.branch_id);
  return row;
}
export async function enrollSupportSla(
  tx: SQL,
  requestId: string,
  branch: string,
  start: Date,
) {
  const policy = await one(
    tx,
    "SELECT value FROM support_sla_policies WHERE branch_id=$1",
    [branch],
  );
  if (!policy) return false;
  const value = supportSlaPolicy.parse(policy.value);
  await tx.query(
    "UPDATE support_requests SET sla_policy=$2,response_due_at=$3,resolution_due_at=$4 WHERE id=$1",
    [
      requestId,
      value,
      supportDueAt(start, value.responseMinutes, value),
      supportDueAt(start, value.resolutionMinutes, value),
    ],
  );
  return true;
}
export async function supportAdvancedAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
): Promise<any> {
  if (action === "support.sla.scan") {
    z.object({}).strict().parse(input);
    return escalateSupportSla(tx, user);
  }
  if (action === "support.sla.policy") {
    allow(user, ["owner", "manager"]);
    const d = z
      .object({ branch: z.string().min(1).max(100) })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.branch);
    return {
      policy:
        (
          await one(
            tx,
            "SELECT value FROM support_sla_policies WHERE branch_id=$1",
            [d.branch],
          )
        )?.value ?? null,
    };
  }
  if (action === "support.sla.save") {
    allow(user, ["owner", "manager"]);
    recentVerification(user);
    const d = z
      .object({ branch: z.string().min(1).max(100), policy: supportSlaPolicy })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager"], d.branch);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        d.branch,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
    await tx.query(
      "INSERT INTO support_sla_policies(branch_id,value,updated_by) VALUES($1,$2,$3) ON CONFLICT(branch_id) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=now()",
      [d.branch, d.policy, user.id],
    );
    await audit(tx, user, "support.sla_policy_changed", d.branch, "success", {
      policy: d.policy,
    });
    return { ok: true };
  }
  if (action === "support.detail") {
    const d = z
      .object({
        id: z.string().uuid(),
        page: z
          .union([
            z.literal("latest"),
            z.coerce.number().int().min(1).max(1000000),
          ])
          .default(1),
      })
      .strict()
      .parse(input);
    const row = await supportTicket(tx, user, d.id);
    const publicOnly = isSupportCustomer(user) ? "AND internal=false" : "";
    const total = Number(
      (
        await one(
          tx,
          `SELECT count(*) AS total FROM support_messages WHERE request_id=$1 ${publicOnly}`,
          [d.id],
        )
      )?.total,
    );
    const pages = Math.max(1, Math.ceil(total / 30));
    const page = d.page === "latest" ? pages : Math.min(d.page, pages);
    const messages = (
      await tx.query(
        `SELECT m.id,m.body,m.internal,m.created_at,u.name AS author FROM support_messages m JOIN users u ON u.id=m.author_id WHERE request_id=$1 ${publicOnly} ORDER BY m.created_at,m.id LIMIT 30 OFFSET $2`,
        [d.id, (page - 1) * 30],
      )
    ).rows;
    const attachments = (
      await tx.query(
        `SELECT id,alt,internal,created_at,mime FROM support_attachments WHERE request_id=$1 ${publicOnly} ORDER BY created_at,id`,
        [d.id],
      )
    ).rows;
    const record = isSupportCustomer(user)
      ? {
          id: row.id,
          subject: row.subject,
          message: row.message,
          status: row.status,
          updated_at: row.updated_at,
          order_id: row.order_id,
        }
      : {
          ...row,
          customer: await one(
            tx,
            "SELECT public_customer_id,name FROM users WHERE id=$1",
            [row.customer_id],
          ),
          sla: supportSlaState(row),
        };
    return {
      ...record,
      messages,
      attachments,
      messagePage: page,
      messagePages: pages,
      messageTotal: total,
      syncedAt: new Date().toISOString(),
    };
  }
  if (action === "support.sla.enroll") {
    const d = z
      .object({ id: z.string().uuid(), version: z.number().int().positive() })
      .strict()
      .parse(input);
    const row = await supportTicket(tx, user, d.id, true);
    allow(user, ["owner", "manager"], row.branch_id);
    if (Number(row.version) !== d.version)
      throw new AppError(
        409,
        "This request changed. Refresh and review it before continuing.",
      );
    if (row.sla_policy)
      throw new AppError(409, "This request already has an SLA policy.");
    if (["resolved", "closed"].includes(row.status))
      throw new AppError(409, "Only active requests can be enrolled.");
    if (!(await enrollSupportSla(tx, row.id, row.branch_id, new Date())))
      throw new AppError(409, "Configure the branch SLA targets first.");
    await tx.query(
      "UPDATE support_requests SET version=version+1,updated_at=now(),first_response_at=COALESCE(first_response_at,(SELECT min(m.created_at) FROM support_messages m WHERE m.request_id=$1 AND m.author_id<>support_requests.customer_id AND NOT m.internal)) WHERE id=$1",
      [row.id],
    );
    await audit(tx, user, "support.sla_enrolled", row.id);
    return { ok: true };
  }
}
export async function attachSupportImage(
  tx: SQL,
  user: Actor,
  input: {
    requestId: string;
    alt: string;
    internal: boolean;
    bytes: Uint8Array;
  },
) {
  const d = z
    .object({
      requestId: z.string().uuid(),
      alt: z.string().trim().min(3).max(250),
      internal: z.boolean(),
    })
    .parse(input);
  const row = await supportTicket(tx, user, d.requestId, true);
  if (d.internal && isSupportCustomer(user))
    throw new AppError(403, "Private attachments are for support staff.");
  if (row.status === "closed")
    throw new AppError(409, "Reopen the request before adding an attachment.");
  const data = await prepareImage(input.bytes, { maximumMb: 3 });
  const sha = createHash("sha256").update(data).digest("hex");
  const existing = await one(
    tx,
    "SELECT id FROM support_attachments WHERE request_id=$1 AND owner_id=$2 AND internal=$3 AND sha256=$4",
    [row.id, user.id, d.internal, sha],
  );
  if (existing) return { id: existing.id, replay: true };
  const count = Number(
    (
      await one(
        tx,
        "SELECT count(*) AS n FROM support_attachments WHERE request_id=$1",
        [row.id],
      )
    )?.n,
  );
  if (count >= 20)
    throw new AppError(
      409,
      "This request has reached its 20-attachment limit. Contact support for further evidence.",
    );
  const attachmentId = id();
  await tx.query(
    "INSERT INTO support_attachments(id,request_id,owner_id,internal,alt,mime,data,sha256) VALUES($1,$2,$3,$4,$5,'image/webp',$6,$7)",
    [attachmentId, row.id, user.id, d.internal, d.alt, data, sha],
  );
  await tx.query(
    "UPDATE support_requests SET updated_at=now(),version=version+1 WHERE id=$1",
    [row.id],
  );
  await audit(tx, user, "support.attachment_added", row.id, "success", {
    attachmentId,
    internal: d.internal,
  });
  if (!d.internal && user.id !== row.customer_id)
    await notify(
      tx,
      row.customer_id,
      "Support attachment",
      "An attachment is available in your support conversation.",
      row.id,
    );
  return { id: attachmentId };
}
export async function escalateSupportSla(tx: SQL, user: Actor) {
  allow(user, ["owner", "manager"]);
  const rows = (
    await tx.query(
      `SELECT s.* FROM support_requests s WHERE status IN ('open','in_progress') AND ($1::boolean OR branch_id=$2) AND ((first_response_at IS NULL AND response_due_at < now() AND NOT EXISTS (SELECT 1 FROM support_sla_notices n WHERE n.request_id=s.id AND n.kind='response' AND n.due_at=s.response_due_at)) OR (resolved_at IS NULL AND resolution_due_at < now() AND NOT EXISTS (SELECT 1 FROM support_sla_notices n WHERE n.request_id=s.id AND n.kind='resolution' AND n.due_at=s.resolution_due_at))) ORDER BY updated_at LIMIT 100 FOR UPDATE SKIP LOCKED`,
      [user.role === "owner", user.branch_id],
    )
  ).rows;
  for (const row of rows) {
    for (const [kind, due, finished] of [
      ["response", row.response_due_at, row.first_response_at],
      ["resolution", row.resolution_due_at, row.resolved_at],
    ]) {
      if (!due || finished || new Date(due) >= new Date()) continue;
      const inserted = await one(
        tx,
        "INSERT INTO support_sla_notices(request_id,kind,due_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING request_id",
        [row.id, kind, due],
      );
      if (!inserted) continue;
      const recipients = (
        await tx.query(
          "SELECT id FROM users WHERE active=true AND (role='owner' OR (branch_id=$1 AND role='manager') OR id=$2)",
          [row.branch_id, row.assignee_id],
        )
      ).rows;
      for (const recipient of recipients)
        await notify(
          tx,
          recipient.id,
          "Support SLA overdue",
          `A support ${kind} target is overdue. Review the Support Desk.`,
          row.id,
        );
      await audit(tx, user, "support.sla_overdue", row.id, "success", {
        kind,
        due,
      });
    }
  }
  return { checked: rows.length };
}
