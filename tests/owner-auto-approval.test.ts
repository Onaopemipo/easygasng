import { consolidatedRole } from "../packages/business-rules/src/staff-roles";
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {createDatabase,migrate,one} from '../apps/web/lib/db';
import {dispatch} from '../apps/web/lib/service';
import {hashPassword,id,issueSession} from '../apps/web/lib/auth';
async function fixture(){const db=await createDatabase('memory://');await migrate(db);const password='Owner-policy-123!';const actors:Record<string,any>={};for(const name of ['owner','otherOwner','manager','administrator','finance','safety_officer']){const role=name==='otherOwner'?'owner':name,uid=id();await db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,$2,$3,$4,$5,'lagos')",[uid,name,`${uid}@test.invalid`,hashPassword(password),consolidatedRole(role)]);actors[name]={id:uid,token:await issueSession(db,uid)};}const call=(role:string,action:string,input:any={})=>dispatch(action,actors[role].token,input,db);for(const role of Object.keys(actors))await call(role,'reauth',{password});const current=(key='gas.price_per_kg')=>one(db,"SELECT * FROM settings WHERE key=$1 AND scope='lagos'",[key]);const propose=async(role='owner',extras:any={})=>call(role,'setting.propose',{key:'gas.price_per_kg',scope:'lagos',version:(await current())!.version,value:180500,reason:'Owner authorised price change',...extras});return{db,actors,call,current,propose,password};}
async function enabled<T>(fn:()=>Promise<T>){const old=process.env.EASYGAS_OWNER_AUTO_APPROVAL;process.env.EASYGAS_OWNER_AUTO_APPROVAL='true';try{return await fn();}finally{if(old===undefined)delete process.env.EASYGAS_OWNER_AUTO_APPROVAL;else process.env.EASYGAS_OWNER_AUTO_APPROVAL=old;}}
test('OWNER-AUTO01: owner submissions auto-apply once with immutable authority proof; staff remain independently reviewed',()=>enabled(async()=>{const f=await fixture();try{const r=await f.propose();assert.equal(r.status,'active');assert.equal(r.autoApproved,true);assert.equal((await f.current())!.value,180500);assert.equal((await f.current())!.version,2);const repeated=await f.call('owner','approval.owner_apply',{id:r.id,reason:'Retry same existing owner request'});assert.equal(repeated.status,'active');assert.equal((await f.current())!.version,2);assert.equal(Number((await one(f.db,"SELECT count(*) n FROM audit_events WHERE action='approval.owner_auto_approved' AND target=$1",[r.id]))!.n),1);assert.equal(Number((await one(f.db,'SELECT count(*) n FROM approval_decisions WHERE request_id=$1',[r.id]))!.n),0);
 await assert.rejects(()=>f.call('manager','approval.owner_apply',{id:id(),reason:'Unauthorised missing request must not leak existence'}),/Only the Business Owner/); const staff=await f.propose('manager',{value:181000});assert.equal(staff.status,'pending_approval');assert.equal((await f.current())!.value,180500);await assert.rejects(()=>f.call('manager','approval.owner_apply',{id:staff.id,reason:'Forged owner authority attempt'}),/only|Owner/i);assert.equal((await f.propose('administrator',{value:181500})).status,'active');await assert.rejects(()=>f.propose('manager',{autoApproved:true}),/Unrecognized|unrecognized/);const settings=await f.call('owner','settings',{scope:'lagos'});assert.equal(settings.find((s:any)=>s.key==='gas.price_per_kg').owner_auto_approval,true);
}finally{await f.db.close?.();}}));
test('OWNER-AUTO02: old pending requests are actionable only by their verified owner; drafts stay inactive until submission',()=>enabled(async()=>{const f=await fixture();try{process.env.EASYGAS_OWNER_AUTO_APPROVAL='false';const r=await f.propose();assert.equal(r.status,'pending_approval');process.env.EASYGAS_OWNER_AUTO_APPROVAL='true';await assert.rejects(()=>f.call('otherOwner','approval.owner_apply',{id:r.id,reason:'Another owner cannot impersonate requester'}),/your own/);await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1",[f.actors.owner.id]);await assert.rejects(()=>f.call('owner','approval.owner_apply',{id:r.id,reason:'Identity needs verification'}),/verif/i);assert.equal((await f.current())!.version,1);await f.call('owner','reauth',{password:f.password});const visible=(await f.call('owner','approvals')).find((a:any)=>a.id===r.id);assert.equal(visible.can_owner_apply,true);assert.equal((await f.call('owner','approval.owner_apply',{id:r.id,reason:'Apply owner request'})).status,'active');
 const draft=await f.propose('owner',{draft:true,value:181000});assert.equal(draft.status,'draft');assert.equal((await f.current())!.value,180500);assert.equal((await f.call('owner','approval.submit',{id:draft.id,reason:'Submit saved owner draft'})).status,'active');assert.equal((await f.current())!.value,181000);
}finally{await f.db.close?.();}}));
test('OWNER-AUTO03: scheduling, current authority, stale versions, expiry, self privileges and live-payment blockers survive auto approval',()=>enabled(async()=>{const f=await fixture();try{const future=new Date(Date.now()+86400000).toISOString();const scheduled=await f.propose('owner',{effectiveAt:future});assert.equal(scheduled.status,'scheduled');assert.equal((await f.current())!.version,1);await f.db.query("UPDATE users SET role='manager' WHERE id=$1",[f.actors.owner.id]);const lost=await f.call('otherOwner','approval.activate',{id:scheduled.id});assert.equal(lost.status,'failed');assert.equal((await f.current())!.version,1);await f.db.query("UPDATE users SET role='owner' WHERE id=$1",[f.actors.owner.id]);
 process.env.EASYGAS_OWNER_AUTO_APPROVAL='false';const old=await f.propose();process.env.EASYGAS_OWNER_AUTO_APPROVAL='true';await f.propose('owner',{value:181500});const stale=await f.call('owner','approval.owner_apply',{id:old.id,reason:'Stale original request'});assert.equal(stale.status,'superseded');assert.equal((await f.current())!.value,181500);
 process.env.EASYGAS_OWNER_AUTO_APPROVAL='false';const expired=await f.propose();process.env.EASYGAS_OWNER_AUTO_APPROVAL='true';await f.db.query("UPDATE change_requests SET expires_at=now()-interval '1 second' WHERE id=$1",[expired.id]);await assert.rejects(()=>f.call('owner','approval.owner_apply',{id:expired.id,reason:'Expired original request'}),/expired/);
 const gateway=await f.current('payment.gateway');await assert.rejects(()=>f.call('owner','setting.propose',{key:'payment.gateway',scope:'lagos',version:gateway!.version,value:{...gateway!.value,environment:'live'},reason:'Live must remain blocked'}),/test|live|Invalid/);const access=await f.current('security.permissions');await assert.rejects(()=>f.call('owner','setting.propose',{key:'security.permissions',scope:'lagos',version:access!.version,value:{userId:f.actors.owner.id,role:'owner',branchId:'lagos'},reason:'Self privilege change remains blocked'}),/own privileges|own/);
 assert.equal((await f.current('payment.gateway'))!.version,gateway!.version);
}finally{await f.db.close?.();}}));
test('OWNER-AUTO04: owner approval does not replace independent qualified safety review or invent safety evidence',()=>enabled(async()=>{const f=await fixture();try{
 const def=await one(f.db,"SELECT d.key,s.value,s.version FROM setting_definitions d JOIN settings s ON s.key=d.key AND s.scope='lagos' WHERE d.value_type='checklist' LIMIT 1");assert.ok(def);
 const r=await f.call('owner','setting.propose',{key:def!.key,scope:'lagos',version:def!.version,value:[{id:'safety_check',label:'Perform qualified safety inspection',required:true}],reason:'Owner approval must retain qualified safety review'});assert.equal(r.status,'partially_approved');assert.equal(r.awaitingQualifiedReview,true);assert.equal((await one(f.db,"SELECT version FROM settings WHERE key=$1 AND scope='lagos'",[def!.key]))!.version,def!.version);
 const again=await f.call('owner','approval.owner_apply',{id:r.id,reason:'Still awaiting safety evidence'});assert.equal(again.status,'partially_approved');assert.equal(Number((await one(f.db,"SELECT count(*) n FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'",[r.id]))!.n),1);
 await assert.rejects(()=>f.call('safety_officer','approval.decide',{id:r.id,decision:'approve',reason:'No qualification must fail'}),/qualification/);
 await f.db.query("INSERT INTO technician_qualifications(id,user_id,code,evidence,expires_at,verified_by) VALUES($1,$2,'safety_review','Synthetic independently verified qualification',now()+interval '1 day',$3)",[id(),f.actors.safety_officer.id,f.actors.otherOwner.id]);
 assert.equal((await f.call('safety_officer','approval.decide',{id:r.id,decision:'approve',reason:'Qualified independent safety review'})).status,'active');

}finally{await f.db.close?.();}}));
test('OWNER-AUTO05: governed inventory request binds immutable operation before automatic application and never posts twice',()=>enabled(async()=>{const f=await fixture();try{
 await f.db.query("UPDATE inventory SET quantity=10 WHERE product_id='hose' AND branch_id='lagos'");
 const input={branchId:'lagos',productId:'hose',quantity:-2,reference:'OWNER-AUTO-INVENTORY',reason:'Verified damaged stock correction',evidence:'Synthetic damage and stock evidence'};
 const r=await f.call('owner','inventory.adjust',input);assert.equal(r.state,'ACTIVE');assert.equal(Number((await one(f.db,"SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'"))!.quantity),8);
 await f.call('owner','inventory.adjust',input);assert.equal(Number((await one(f.db,"SELECT quantity FROM inventory WHERE product_id='hose' AND branch_id='lagos'"))!.quantity),8);
}finally{await f.db.close?.();}}));
test('OWNER-AUTO06: owner rollback uses the same audited policy and preserves historical versions',()=>enabled(async()=>{const f=await fixture();try{const r=await f.propose();const version=await one(f.db,'SELECT id FROM setting_versions WHERE request_id=$1',[r.id]);assert.ok(version);const reversed=await f.call('owner','setting.rollback',{versionId:version!.id,reason:'Restore preceding owner-approved price'});assert.equal(reversed.status,'active');assert.equal(reversed.autoApproved,true);assert.equal((await f.current())!.value,180000);assert.equal((await f.current())!.version,3);assert.equal((await one(f.db,'SELECT status FROM change_requests WHERE id=$1',[r.id]))!.status,'rolled_back');assert.equal(Number((await one(f.db,'SELECT count(*) n FROM setting_versions'))!.n),2);}finally{await f.db.close?.();}}));

test('OWNER-AUTO07: verified owners can confirm delivery coverage; staff requests and blank boundaries still block ordering', () => enabled(async () => {
  const f = await fixture();
  try {
    const propose = async (role: string, key: string, value: unknown) =>
      f.call(role, 'setting.propose', { key, scope: 'lagos', version: (await f.current(key))!.version, value, reason: 'Synthetic demo-only approval test' });
    const policy = { minimumKg: 0.5, maximumKg: 50, incrementKg: 0.5, precision: 1, capacitiesKg: [3, 6, 12.5, 25, 50] };
    await f.db.query("UPDATE settings SET value='true' WHERE key='delivery.enabled' AND scope='lagos'");
    await f.call('owner', 'gas.stock.receive', {
      branchId: 'lagos', grams: 10000, reference: 'OWNER-COVERAGE-TEST', reason: 'Synthetic measured receipt',
    });
    assert.equal((await propose('owner', 'gas.quantity_policy', policy)).status, 'active');
    assert.equal((await propose('owner', 'delivery.fee', 530000)).status, 'active');
    const ownerSettings = await f.call('owner', 'settings', { scope: 'lagos' });
    assert.equal(ownerSettings.find((s: any) => s.key === 'location.lekki').owner_auto_approval, true);
    for (const key of ['security.permissions', 'payment.gateway', 'payment.integration']) {
      assert.equal(ownerSettings.find((s: any) => s.key === key).owner_auto_approval, false);
    }
    const original = (await f.current('location.lekki'))!.value;
    const confirmed = { ...original, coverage: 'Synthetic district boundary confirmed for fixture only' };
    const quote = (locationId = 'lekki') => dispatch('gas.quote', null, { locationId, lines: [{ capacityKg: 12.5, kg: 4.5 }] }, f.db);
    await assert.rejects(quote, { code: 'DELIVERY_COVERAGE_PENDING' });
    assert.equal((await propose('manager', 'location.lekki', confirmed)).status, 'pending_approval');
    await assert.rejects(quote, { code: 'DELIVERY_COVERAGE_PENDING' });
    await f.db.query("UPDATE sessions SET verified_at=NULL WHERE user_id=$1", [f.actors.administrator.id]);
    await assert.rejects(() => propose('administrator', 'location.lekki', confirmed), /verif/i);
    await f.call('administrator', 'reauth', { password: f.password });
    const result = await propose('administrator', 'location.lekki', confirmed);
    assert.equal(result.status, 'active');
    assert.equal(result.autoApproved, true);
    assert.equal((await quote()).deliveryKobo, 530000);
    assert.equal((await one(f.db, "SELECT coverage FROM delivery_locations WHERE id='lekki'"))!.coverage, confirmed.coverage);
    const catalogue = await dispatch('gas.catalogue', null, {}, f.db);
    assert.equal(catalogue.locations.find((l: any) => l.id === 'lekki').requires_address_confirmation, true);
    assert.equal((await one(f.db, "SELECT actor_id FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved'", [result.id]))!.actor_id, f.actors.administrator.id);
    const created = await f.call('owner', 'delivery.location.create', {
      config: { ...original, name: 'Synthetic Area', coverage: '' },
      reason: 'Test that an approved area can still lack coverage',
    });
    assert.equal(created.request.status, 'active');
    await assert.rejects(() => quote(created.id), { code: 'DELIVERY_COVERAGE_PENDING' });
  } finally { await f.db.close?.(); }
}));

test('OWNER-AUTO08: an existing owner coverage request can be approved by its requester without approving other pending requests', () => enabled(async () => {
  const f = await fixture();
  try {
    process.env.EASYGAS_OWNER_AUTO_APPROVAL = 'false';
    const key = 'location.victoria-island';
    const current = (await f.current(key))!;
    const input = { key, scope: 'lagos', version: current.version, value: { ...current.value, coverage: 'Synthetic approved boundary for Victoria Island fixture' }, reason: 'Synthetic operational confirmation' };
    const request = await f.call('owner', 'setting.propose', input);
    const staff = await f.call('manager', 'setting.propose', input);
    assert.equal(request.status, 'pending_approval');
    process.env.EASYGAS_OWNER_AUTO_APPROVAL = 'true';
    assert.equal((await f.call('owner', 'approvals')).find((r: any) => r.id === request.id).can_owner_apply, true);
    await assert.rejects(() => f.call('otherOwner', 'approval.owner_apply', { id: request.id, reason: 'Only the requester may use automatic approval' }), /your own/);
    assert.equal((await f.call('owner', 'approval.owner_apply', { id: request.id, reason: 'Confirm the original proposal' })).status, 'active');
    assert.equal((await one(f.db, 'SELECT status FROM change_requests WHERE id=$1', [staff.id]))!.status, 'pending_approval');
  } finally { await f.db.close?.(); }
}));

test('OWNER-AUTO-UI: owner apply action and status-specific guidance replace unconditional independent-review messaging',()=>{const s=readFileSync('apps/web/components/admin.tsx','utf8');assert.ok(s.includes('selected.can_owner_apply'));assert.ok(s.includes('Use Approve above. Verify your identity first if prompted.'));assert.ok(s.includes('Saved drafts must be submitted; qualified safety reviews and activation checks still apply.'));assert.ok(s.includes('approval.owner_apply'));});
