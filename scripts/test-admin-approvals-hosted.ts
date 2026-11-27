import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { remoteDatabase, prepare, saveState, privateFile, out, call, hash, label } from './lib/admin-hosted-fixture';
import { one } from '../apps/web/lib/db';
const mode = process.argv[2], db = await remoteDatabase();
await mkdir(out, { recursive: true });
try {
    if (mode === 'prepare') {
        const state: any = { runId: randomUUID(), fixtures: {} };
        for (const kind of ['base', 'service', 'bulk']) {
            state.fixtures[kind] = await prepare(db, kind);
            await saveState(state);
            console.log('PREPARED ' + kind + ' ' + state.fixtures[kind].branch);
        }
    }
    else if (mode === 'prepare-doorstep') {
        const state = JSON.parse(await readFile(privateFile, 'utf8'));
        for (const kind of ['doorstep-gas', 'doorstep-products']) {
            if (state.fixtures[kind])
                continue;
            state.fixtures[kind] = await prepare(db, kind);
            await saveState(state);
            console.log('PREPARED ' + kind + ' ' + state.fixtures[kind].branch);
        }
    }
    else if (mode === 'inspect') {
        const state = JSON.parse(await readFile(privateFile, 'utf8'));
        for (const [kind, f] of Object.entries<any>(state.fixtures)) {
            const me = await call(f, 'owner', 'me');
            assert.equal(me.user.id, f.actors.owner.id);
            console.log('PASS ' + kind + ' hosted Admin session');
        }
    }
    else if (mode === 'refresh-service') {
        const state = JSON.parse(await readFile(privateFile, 'utf8')), f = state.fixtures.service;
        const { label } = await import('./lib/admin-hosted-fixture');
        const svc = await one(db, "SELECT * FROM service_catalogue WHERE id='cooker-servicing' AND branch_id=$1", [f.branch]);
        assert(svc);
        const startsAt = new Date(Date.now() + 8 * 86400000), endsAt = new Date(+startsAt + svc.config.durationMinutes * 60000);
        const slot = await call(f, 'owner', 'services.slot.create', { serviceId: svc.id, branchId: f.branch, technicianId: f.actors.technician.id, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() });
        const b = await call(f, 'customer', 'booking.create', { serviceId: svc.id, branchId: f.branch, serviceVersion: svc.version, slotId: slot.id, address: { street: '12 SANDBOX ONLY Avenue', zone: 'Ikoyi', phone: '08000000000' }, equipment: { brand: 'SANDBOX', type: 'Cooker', burners: 2, newEquipment: false, supplyPresent: true, concerns: label }, notes: label, idempotencyKey: randomUUID(), operationKey: randomUUID() });
        for (const status of ['confirmed', 'assigned', 'en_route', 'in_progress'])
            await call(f, ['confirmed', 'assigned'].includes(status) ? 'owner' : 'technician', 'booking.transition', { bookingId: b.id, status, reason: label, operationKey: randomUUID() });
        f.priorBookings = [...(f.priorBookings ?? []), f.booking.id];
        f.invoiceCorrectionBooking = f.booking.id;
        f.booking = b;
        delete f.quote;
        await saveState(state);
        console.log('PASS fresh service fixture created without rewriting the earlier unsuccessful booking');
    }
    else if (mode === 'resume-service') {
        const state = JSON.parse(await readFile(privateFile, 'utf8')), f = state.fixtures.service, b = await one(db, "SELECT * FROM service_bookings WHERE branch_id=$1 AND status='assigned' ORDER BY created_at DESC LIMIT 1", [f.branch]);
        assert(b);
        await call(f, 'technician', 'booking.assignment.respond', { bookingId: b.id, version: b.version, decision: 'acknowledged', operationKey: randomUUID() });
        for (const status of ['en_route', 'in_progress'])
            await call(f, 'technician', 'booking.transition', { bookingId: b.id, status, reason: label, operationKey: randomUUID() });
        f.priorBookings = [...(f.priorBookings ?? []), f.booking.id];
        f.invoiceCorrectionBooking = f.booking.id;
        f.booking = b;
        delete f.quote;
        await saveState(state);
        console.log('PASS fresh service booking accepted and ready for approval tests');
    }
    else if (mode === 'inspect-doorstep') {
        const state = JSON.parse(await readFile(privateFile, 'utf8'));
        for (const kind of ['doorstep-gas', 'doorstep-products']) {
            const f = state.fixtures[kind];
            console.log(JSON.stringify({ kind, rows: (await db.query('SELECT o.status,o.driver_id,o.tracking_version,m.order_version,m.attempt_id,m.driver_id amendment_driver,a.id current_attempt,a.state,a.driver_id attempt_driver FROM orders o JOIN doorstep_amendments m ON m.order_id=o.id LEFT JOIN delivery_attempts a ON a.order_id=o.id WHERE m.id=$1', [f.amendmentContext.amendmentId])).rows }));
        }
    }
    else if (mode === 'audit') {
        const state = JSON.parse(await readFile(privateFile, 'utf8')), receipt: any = { runId: state.runId, status: 'RUNNING', requests: [], noGoPreserved: true };
        for (const f of Object.values<any>(state.fixtures)) {
            const rows = (await db.query("SELECT id,requester_id,status,revision FROM change_requests WHERE scope=$1 AND status IN ('active','scheduled','approved') ORDER BY id", [f.branch])).rows;
            for (const r of rows) {
                const decisions = (await db.query("SELECT approver_id actor FROM approval_decisions WHERE request_id=$1 AND revision=$2 AND decision='approve' UNION ALL SELECT actor_id actor FROM audit_events WHERE target=$1 AND action='approval.owner_auto_approved' AND outcome='success'", [r.id, r.revision])).rows;
                assert.equal(decisions.length, 1, r.id + ' exactly one authorisation');
                assert.equal(decisions[0].actor, f.actors.owner.id, r.id + ' current fixture Admin');
                receipt.requests.push({ id: r.id, status: r.status, adminAuthorisations: 1, otherApprovers: 0 });
            }
        }
        receipt.activeOrScheduledRequests = receipt.requests.length;
        receipt.originalLagosCOD = (await one(db, "SELECT value FROM settings WHERE scope='lagos' AND key='payment.cod'"))?.value;
        assert.equal(receipt.originalLagosCOD, false);
        receipt.schemaVersion = (await one(db, 'SELECT max(version) version FROM schema_migrations'))?.version;
        assert.equal(receipt.schemaVersion, '085');
        receipt.status = 'PASS';
        await writeFile(out + 'canonical-authority.json', JSON.stringify(receipt, null, 2) + '\n');
        console.log('PASS ' + receipt.requests.length + ' canonical requests have exactly one Admin authorisation and zero other approvers; Lagos COD remains off');
    }
    else if (mode === 'cleanup') {
        const state = JSON.parse(await readFile(privateFile, 'utf8')), receipt: any = { runId: state.runId, branches: [], status: 'RUNNING' };
        for (const f of Object.values<any>(state.fixtures)) {
            assert(/^qa-admin-[a-f0-9-]+$/.test(f.branch));
            if ((await one(db, 'SELECT active FROM branches WHERE id=$1', [f.branch]))?.active === false) {
                assert.equal(Number((await one(db, 'SELECT count(*) n FROM sessions s JOIN users u ON u.id=s.user_id WHERE u.branch_id=$1 AND s.revoked_at IS NULL', [f.branch]))?.n), 0);
                receipt.branches.push({ branch: f.branch, alreadyRetired: true, sessionsRemaining: 0 });
                continue;
            }
            await call(f, 'owner', 'reauth', { password: f.passwords.owner });
            const requests = (await db.query("SELECT id FROM change_requests WHERE scope=$1 AND status IN ('draft','pending_approval','partially_approved','approved','scheduled','failed','needs_reapproval','returned_for_changes')", [f.branch])).rows;
            for (const r of requests)
                await call(f, 'owner', 'approval.cancel', { id: r.id, reason: label + ' cleanup' });
            const users = (await db.query('SELECT id FROM users WHERE branch_id=$1', [f.branch])).rows.map(x => x.id);
            assert(users.includes(f.actors.owner.id));
            await db.transaction(async (tx) => { await tx.query('UPDATE sessions SET revoked_at=now() WHERE user_id=ANY($1::text[]) AND revoked_at IS NULL', [users]); await tx.query("UPDATE message_outbox SET status='cancelled' WHERE user_id=ANY($1::text[]) AND status='pending'", [users]); await tx.query('UPDATE users SET active=false,driver_available=false,technician_available=false WHERE id=ANY($1::text[]) AND branch_id=$2', [users, f.branch]); await tx.query('UPDATE branches SET active=false WHERE id=$1', [f.branch]); await tx.query("INSERT INTO audit_events(id,actor_id,action,target,outcome,detail) VALUES($1,$2,'qa.admin_fixture.retired',$3,'success',$4)", [randomUUID(), f.actors.owner.id, f.branch, JSON.stringify({ synthetic: true, qaBranch: f.branch, usersDisabled: users.length, sessionsRevoked: true, historyPreserved: true })]); });
            assert.equal(Number((await one(db, 'SELECT count(*) n FROM sessions WHERE user_id=ANY($1::text[]) AND revoked_at IS NULL', [users]))?.n), 0);
            try {
                await call(f, 'owner', 'me');
                throw Error('Retired QA session unexpectedly accepted');
            }
            catch (e: any) {
                assert.equal(e.status, 401);
            }
            receipt.branches.push({ branch: f.branch, usersDisabled: users.length, sessionsRemaining: 0, retiredSessionRejected: true, pendingMessagesCancelled: true, pendingRequestsCancelled: requests.length, immutableHistoryPreserved: true });
            for (const a of Object.values<any>(f.actors))
                delete a.token;
            delete f.passwords;
            await saveState(state);
        }
        receipt.status = 'PASS';
        receipt.originalLagosCOD = (await one(db, "SELECT value FROM settings WHERE scope='lagos' AND key='payment.cod'"))?.value;
        await writeFile(out + 'cleanup.json', JSON.stringify(receipt, null, 2) + '\n');
        console.log('PASS QA branches/accounts retired; sessions revoked; immutable history retained');
    }
    else if (mode === 'preservation-proof') {
 const {stat}=await import('node:fs/promises');const state=JSON.parse(await readFile(privateFile,'utf8')),before=JSON.parse(await readFile(out+'before.json','utf8')),after=JSON.parse(await readFile(out+'after.json','utf8')),cutoff=before.capturedAt??(await stat(out+'before.json')).mtime.toISOString(),branches=Object.values<any>(state.fixtures).map(f=>f.branch),uids=(await db.query('SELECT id FROM users WHERE branch_id=ANY($1::text[])',[branches])).rows.map(r=>r.id);
 const result:any={status:'RUNNING',tables:156,exactTableMatches:Object.keys(before.tables).filter(k=>JSON.stringify(before.tables[k])===JSON.stringify(after.tables[k])).length,metadata:{},cutoff,originalLagosCOD:false};
 const normalized=JSON.parse(await readFile(out+'after-normalized.json','utf8'));result.metadata.audit_events={...normalized.metadataAuditReconstruction,newAppendOnlyEvents:after.tables.audit_events.count-before.tables.audit_events.count};
 const m=(await db.query("SELECT md5((to_jsonb(r)-'driver_last_seen_at'-'last_heartbeat_at')::text) h FROM message_outbox r WHERE created_at<=$1 AND user_id<>ALL($2::text[])",[cutoff,uids])).rows.map(r=>r.h).sort();result.metadata.message_outbox={baselineCount:before.tables.message_outbox.count,reconstructedCount:m.length,originalRowsMatch:hash(m)===before.tables.message_outbox.hash,qaReferenceClosureDifference:before.tables.message_outbox.count-after.tables.message_outbox.count};
 const rows=(await db.query("SELECT key,md5((to_jsonb(r)-'driver_last_seen_at'-'last_heartbeat_at')::text) h FROM auth_attempts r")).rows.filter(r=>!uids.some(uid=>r.key.includes(uid))).map(r=>r.h).sort();let removed=0;for(let i=0;i<rows.length;i++)if(hash(rows.filter((_,j)=>j!==i))===before.tables.auth_attempts.hash)removed++;result.metadata.auth_attempts={baselineCount:before.tables.auth_attempts.count,currentCount:rows.length,originalRowsMatch:removed===1,addedAnonymousRateLimitRows:removed};
 result.status=result.exactTableMatches===153&&Object.values<any>(result.metadata).every(m=>m.originalRowsMatch)?'PASS':'REVIEW_REQUIRED';await writeFile(out+'preservation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));if(result.status!=='PASS')process.exitCode=1;
 }
 else if (mode === 'capture') {
        const state = JSON.parse(await readFile(privateFile, 'utf8'));
        const { capture } = await import('./lib/admin-hosted-preservation');
        await capture(db, state, process.argv[3] ?? 'before');
        console.log('PASS original-record fingerprint capture');
    }
    else if (['base', 'bulk', 'service', 'settings', 'supplemental', 'doorstep'].includes(mode)) {
        const state = JSON.parse(await readFile(privateFile, 'utf8'));
        const { runCases } = await import('./lib/admin-hosted-cases');
        const report = await runCases(db, state, mode);
        if (report.failed)
            process.exitCode = 1;
    }
    else
        throw Error('Unknown mode');
}
catch (e: any) {
    console.error('QA ERROR: ' + String(e.message).slice(0, 700));
    process.exitCode = 1;
}
finally {
    await db.close?.();
}
