import test from "node:test";
import assert from "node:assert/strict";
import { createDatabase, migrate, one } from "../apps/web/lib/db";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { dispatch } from "../apps/web/lib/service";
import { approvalStatusLabel } from "../packages/business-rules/src/approval-progress";

async function fixture() {
  const db = await createDatabase("memory://");
  await migrate(db);
  const accounts: Record<string, { id: string; token: string }> = {};
  const password = "Approval-fixture-only-123!";
  for (const name of ["owner", "reviewer", "finance", "manager"]) {
    const uid = id(),
      role = name === "reviewer" ? "owner" : name;
    await db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",
      [uid, name, uid + "@test.invalid", hashPassword(password), role],
    );
    accounts[name] = { id: uid, token: await issueSession(db, uid) };
  }
  const call = (name: string, action: string, input: any = {}) =>
    dispatch(action, accounts[name].token, input, db);
  for (const name of Object.keys(accounts))
    await call(name, "reauth", { password });
  const setting = (key: string) =>
    one(db, "SELECT * FROM settings WHERE key=$1 AND scope='lagos'", [key]);
  const propose = async (key: string, extras: any = {}) =>
    call("owner", "setting.propose", {
      key,
      scope: "lagos",
      version: (await setting(key))!.version,
      value: (await setting(key))!.value,
      reason: "Synthetic owner business decision",
      ...extras,
    });
  const row = async (rid: string) =>
    (await call("owner", "approvals")).find((r: any) => r.id === rid);
  return { db, accounts, call, setting, propose, row, password };
}
async function withPolicy(fn: () => Promise<void>) {
  const old = process.env.EASYGAS_OWNER_AUTO_APPROVAL;
  process.env.EASYGAS_OWNER_AUTO_APPROVAL = "true";
  try {
    await fn();
  } finally {
    if (old === undefined) delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;
    else process.env.EASYGAS_OWNER_AUTO_APPROVAL = old;
  }
}

// Approved scope change: ASA supersedes the former two-reviewer Admin policy.
test("APC-OWNER: legacy saved Admin requests need one verified Admin approval",()=>withPolicy(async()=>{
 const f=await fixture();try{const r=await f.propose("loyalty.policy",{draft:true});await f.db.query("UPDATE change_requests SET status='pending_approval' WHERE id=$1",[r.id]);
 const row=await f.row(r.id);assert.equal(row.can_owner_apply,true);assert.equal(row.approval_progress.required,1);
 await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1",[f.accounts.owner.id]);await assert.rejects(()=>f.call("owner","approval.owner_apply",{id:r.id,reason:"Fresh verification required"}),/verif/i);
 await f.call("owner","reauth",{password:f.password});assert.equal((await f.call("owner","approval.owner_apply",{id:r.id,reason:"Admin final approval"})).status,"active");
 await f.call("owner","approval.owner_apply",{id:r.id,reason:"Replay same confirmation"});assert.equal((await f.setting("loyalty.policy"))!.version,2);
 assert.equal(Number((await one(f.db,"SELECT count(*) n FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'",[r.id]))!.n),1);
 }finally{await f.db.close?.();}
}));
test("APC-PROGRESS: one Admin approval satisfies high-risk role coverage; revoked authority invalidates its proof",()=>withPolicy(async()=>{
 const f=await fixture();try{const current=(await f.setting("payment.gateway"))!;const r=await f.call("finance","setting.propose",{key:current.key,scope:"lagos",version:current.version,value:current.value,reason:"Synthetic gateway review"});
 const pending=await f.row(r.id);assert.equal(pending.approval_progress.required,1);assert.equal(pending.can_approve,true);
 await assert.rejects(()=>f.call("finance","approval.decide",{id:r.id,decision:"approve",reason:"Cannot self review"}),/independent/);
 assert.equal((await f.call("owner","approval.decide",{id:r.id,decision:"approve",reason:"Single Admin approval"})).status,"active");
 assert.equal((await f.row(r.id)).approval_progress.approved,1);assert.equal((await f.row(r.id)).approval_progress.complete,true);
 await f.db.query("UPDATE users SET active=false WHERE id=$1",[f.accounts.owner.id]);const row=(await f.call("reviewer","approvals")).find((v:any)=>v.id===r.id);assert.equal(row.approval_progress.complete,false);
 }finally{await f.db.close?.();}
}));
test("APC-SECURITY: Admin authority cannot be borrowed; expiry, versions and live-payment evidence still block activation",()=>withPolicy(async()=>{
 const f=await fixture();try{const r=await f.propose("loyalty.policy",{draft:true});await f.db.query("UPDATE change_requests SET status='pending_approval' WHERE id=$1",[r.id]);
 await assert.rejects(()=>f.call("finance","approval.owner_apply",{id:r.id,reason:"Cannot borrow Admin"}),/Owner/);await assert.rejects(()=>f.call("reviewer","approval.owner_apply",{id:r.id,reason:"Cannot impersonate requester"}),/your own/);
 await f.db.query("UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",[r.id]);await assert.rejects(()=>f.call("owner","approval.owner_apply",{id:r.id,reason:"Expired request"}),/expired/);
 const stale=await f.propose("gas.price_per_kg",{draft:true,value:190000});await f.db.query("UPDATE change_requests SET status='pending_approval' WHERE id=$1",[stale.id]);await f.propose("gas.price_per_kg",{value:195000});assert.equal((await f.call("owner","approval.owner_apply",{id:stale.id,reason:"Stale request"})).status,"superseded");
 const gateway=(await f.setting("payment.gateway"))!;await assert.rejects(()=>f.propose("payment.gateway",{value:{...gateway.value,environment:"live"}}),/live|test|sandbox|Invalid/i);
 }finally{await f.db.close?.();}
}));
