import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID, randomBytes } from 'node:crypto';
import { createDatabase, one, type DB } from '../../apps/web/lib/db';
import { hashPassword, issueSession } from '../../apps/web/lib/auth';
import { fixture as orderFixture } from '../../tests/helpers/order-tracking-fixture';
import { fixture as serviceFixture, begin } from '../../tests/helpers/service-fixture';
import { bulkFixture } from '../../tests/helpers/bulk-lpg-fixture';
import { vehicleFixture } from '../../tests/helpers/vehicle-products-fixture';
export const base = process.env.EASYGAS_ADMIN_QA_BASE ?? 'https://easygas-client-demo.vercel.app';
if (base !== 'https://easygas-client-demo.vercel.app' && !/^https:\/\/easygas-client-demo-[a-z0-9]+-onaopemipos-projects\.vercel\.app$/.test(base))
    throw Error('Expected existing demo deployment URL');
export const label = 'SANDBOX ONLY — Admin approval audit';
export const privateFile = process.env.EASYGAS_ADMIN_QA_STATE!;
if (!privateFile?.startsWith('/Users/philipog/Documents/ChatGPT/Easygas Smart Solution/.data/'))
    throw Error('Use an ignored private QA state file');
export const out = 'docs/admin-single-approval/hosted-audit/';
export async function remoteDatabase() { process.env.EASYGAS_BACKGROUND_JOBS = 'false'; const raw = (await readFile('/tmp/easygas-admin-runtime-url.txt', 'utf8')).trim(), u = new URL(raw); if (u.username !== 'easygas_demo_runtime' || !u.hostname.endsWith('.neon.tech'))
    throw Error('Restricted demo runtime required'); u.hostname = u.hostname.replace('-pooler.', '.'); u.searchParams.set('sslmode', 'verify-full'); u.searchParams.delete('channel_binding'); process.env.DATABASE_URL = u.toString(); process.env.NODE_ENV = 'production'; const db = await createDatabase(); const r = await one(db, "SELECT current_user r,current_database() d,(SELECT max(version) FROM schema_migrations) v"); if (r?.r !== 'easygas_demo_runtime' || r?.d !== 'neondb' || r?.v !== '085')
    throw Error('Unexpected demo database'); return db; }
export async function call(f: any, role: string, action: string, input?: any, attempt = 0) {
    const headers: any = { 'content-type': 'application/json', origin: 'https://easygas-client-demo.vercel.app', 'x-easygas-client': 'native', ...(f.actors[role]?.token ? { authorization: 'Bearer ' + f.actors[role].token } : {}) };
    const response = await fetch(base + '/api/' + action, { method: input === undefined ? 'GET' : 'POST', headers, ...(input === undefined ? {} : { body: JSON.stringify(input) }), signal: AbortSignal.timeout(45000) });
    let status = response.status;
    let data: any;
    try {
        data = await response.json();
    }
    catch {
        data = { error: 'Non-JSON response; deployment may require additional authentication' };
    }
    // Use the existing provider-authorised transport only when Vercel explicitly challenges this candidate.
    if (status === 401 && data?.protection?.vercel_auth_enabled) {
        const tmp = await mkdtemp(path.join(os.tmpdir(), 'easygas-admin-auth-'));
        try {
            const cfg = path.join(tmp, 'request.cfg'), body = path.join(tmp, 'body'), output = path.join(tmp, 'response');
            const lines = ['silent', 'show-error', 'max-time = 45', 'request = ' + JSON.stringify(input === undefined ? 'GET' : 'POST'), 'output = ' + JSON.stringify(output), 'write-out = "%{http_code}"', ...Object.entries(headers).map(([k, v]) => 'header = ' + JSON.stringify(k + ': ' + v))];
            if (input !== undefined) {
                await writeFile(body, JSON.stringify(input), { mode: 0o600 });
                lines.push('data-binary = ' + JSON.stringify('@' + body));
            }
            await writeFile(cfg, lines.join('\n') + '\n', { mode: 0o600 });
            const result = await promisify(execFile)('vercel', ['curl', '/api/' + action, '--deployment', base, '--scope', 'onaopemipos-projects', '--', '--config', cfg], { cwd: path.resolve(path.dirname(privateFile), 'hosted-audit-release/source'), timeout: 60000, maxBuffer: 12000 });
            status = Number(result.stdout.trim().match(/(\d{3})$/)?.[1]);
            data = JSON.parse(await readFile(output, 'utf8'));
            f.providerAuthorisedTransportCount = (f.providerAuthorisedTransportCount ?? 0) + 1;
        }
        finally {
            await rm(tmp, { recursive: true, force: true });
        }
    }
    // Only a definite pre-mutation identity-verification rejection is retried.
    if (status === 403 && data?.code === 'REAUTH_REQUIRED' && action !== 'reauth' && attempt === 0 && f.passwords?.[role]) {
        await call(f, role, 'reauth', { password: f.passwords[role] });
        f.sameActorReauthCount = (f.sameActorReauthCount ?? 0) + 1;
        return call(f, role, action, input, 1);
    }
    if (data && typeof data === 'object')
        delete data.verificationContext;
    if (status !== 200)
        throw Object.assign(Error(action + ': ' + status + ' ' + JSON.stringify(data)), { status, data });
    return data;
}
export async function actorSetup(f: any) { const password = 'Admin-hosted-synthetic-123!'; for (const role of ['finance', 'manager', 'target', 'secondOwner']) {
    if (f.actors[role])
        continue;
    const uid = randomUUID(), actual = role === 'target' ? 'customer' : role === 'secondOwner' ? 'owner' : role;
    await f.db.query("INSERT INTO users(id,name,email,password_hash,role,branch_id,verified) VALUES($1,$2,$3,$4,$5,'lagos',true)", [uid, label + ' ' + role, uid + '@qa.easygas.invalid', hashPassword(password), actual]);
    f.actors[role] = { id: uid, token: await issueSession(f.db, uid) };
} await f.db.query("UPDATE users SET name=$1||' '||role,email=id||'@qa.easygas.invalid'", [label]); f.passwords = {}; for (const [role, a] of Object.entries<any>(f.actors)) {
    const generated = 'QA!' + randomBytes(24).toString('base64url');
    f.passwords[role] = generated;
    await f.db.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hashPassword(generated), a.id]);
} await f.db.query('UPDATE sessions SET verified_at=now()'); return f; }
const ident = (s: string) => '"' + s.replaceAll('"', '""') + '"';
export async function importFixture(remote: DB, f: any, branch: string) {
    if (!/^qa-admin-[a-f0-9-]+$/.test(branch))
        throw Error('QA branch required');
    const locs = (await f.db.query('SELECT id FROM delivery_locations')).rows.map(x => x.id);
    const remap = (s: string) => { s = s.replaceAll('lagos', branch); for (const loc of locs) {
        if (s === loc)
            s = branch + '-' + loc;
        else
            s = s.replaceAll('location.' + loc, 'location.' + branch + '-' + loc);
    } return s; };
    const map = (v: any): any => v instanceof Date ? v.toISOString() : typeof v === 'string' ? remap(v) : Array.isArray(v) ? v.map(map) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, v]) => [k, map(v)])) : v;
    const tables = (await f.db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(x => x.tablename);
    const allColumns = (await remote.query("SELECT c.relname t,a.attname n,a.attnotnull nn,ty.typname typ FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace ns ON ns.oid=c.relnamespace JOIN pg_type ty ON ty.oid=a.atttypid WHERE ns.nspname='easygas_private' AND a.attnum>0 AND NOT a.attisdropped")).rows;
    const dependencies = (await remote.query("SELECT c.relname child,p.relname parent FROM pg_constraint fk JOIN pg_class c ON c.oid=fk.conrelid JOIN pg_class p ON p.oid=fk.confrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE fk.contype='f' AND n.nspname='easygas_private'")).rows;
    const skip = new Set(['schema_migrations', 'products', 'categories', 'expense_categories', 'legal_documents']);
    const batches: any[] = [];
    for (const t of tables) {
        if (skip.has(t))
            continue;
        const rows = (await f.db.query('SELECT * FROM ' + ident(t))).rows.map(map);
        if (!rows.length)
            continue;
        for (const row of rows) {
            if (t === 'branches')
                row.name = label + ' ' + branch;
            if (t === 'customer_invoices')
                row.invoice_number = 'QA-ADMIN-' + row.id;
            if (t === 'audit_events')
                row.detail = { ...row.detail, synthetic: true, fixturePreparation: true, qaBranch: branch };
        }
        const columns = allColumns.filter(c => c.t === t && Object.hasOwn(rows[0], c.n));
        batches.push({ t, rows, columns });
    }
    // Order-event insertion triggers tracking increments. Start only new fixture orders
    // at zero and replay the source event ordering so their derived versions stay aligned.
    for (const b of batches.filter(b => b.t === 'orders'))
        for (const row of b.rows) {
            const events = batches.find(x => x.t === 'order_events')?.rows.filter(x => x.order_id === row.id) ?? [];
            if (Number(row.tracking_version) !== events.length)
                throw Error('Fixture tracking/event count needs explicit review');
            row.tracking_version = 0;
        }
    for (const b of batches.filter(b => b.t === 'order_events'))
        b.rows.sort((a: any, b: any) => Number(a.version) - Number(b.version));
    // Cross-links are installed only after both newly generated fixture parents exist.
    const late: any[] = [];
    for (const b of batches.filter(b => b.t === 'service_bookings'))
        for (const row of b.rows)
            if (row.work_quote_id) {
                late.push({ id: row.id, work_quote_id: row.work_quote_id });
                row.work_quote_id = null;
            }
    await remote.transaction(async (tx) => { if (await one(tx, 'SELECT id FROM branches WHERE id=$1', [branch]))
        throw Error('QA branch already exists'); const remaining = [...batches], ordered: any[] = []; while (remaining.length) {
        const next = remaining.find(b => !dependencies.some(d => d.child === b.t && d.parent !== b.t && remaining.some(p => p.t === d.parent)));
        if (!next) {
            ordered.push(...remaining);
            break;
        }
        ordered.push(next);
        remaining.splice(remaining.indexOf(next), 1);
    } let pending = ordered; while (pending.length) {
        let progress = false;
        const next = [];
        for (const b of pending) {
            await tx.exec('SAVEPOINT qa_insert');
            try {
                await tx.query('INSERT INTO ' + ident(b.t) + ' (' + b.columns.map(c => ident(c.n)).join(',') + ') SELECT ' + b.columns.map(c => c.nn && ['jsonb', 'json'].includes(c.typ) ? 'COALESCE(r.' + ident(c.n) + ',\'null\'::' + c.typ + ')' : 'r.' + ident(c.n)).join(',') + ' FROM jsonb_populate_recordset(NULL::' + ident(b.t) + ',$1::jsonb) r ON CONFLICT DO NOTHING', [JSON.stringify(b.rows)]);
                await tx.exec('RELEASE SAVEPOINT qa_insert');
                progress = true;
            }
            catch (e: any) {
                await tx.exec('ROLLBACK TO SAVEPOINT qa_insert');
                await tx.exec('RELEASE SAVEPOINT qa_insert');
                if (e.code !== '23503')
                    throw Object.assign(Error('QA import ' + b.t + ': ' + e.message), { cause: e });
                next.push(b);
            }
        }
        if (!progress)
            throw Error('Unresolved fixture parent tables: ' + next.map(b => b.t).join(','));
        pending = next;
    } for (const row of late)
        await tx.query('UPDATE service_bookings SET work_quote_id=$1 WHERE id=$2', [row.work_quote_id, row.id]); await tx.query("INSERT INTO audit_events(id,action,target,outcome,detail) VALUES($1,'qa.admin_fixture.prepared',$2,'success',$3)", [randomUUID(), branch, JSON.stringify({ synthetic: true, qaBranch: branch, existingRecordsChanged: false, scope: 'User-requested deployed Admin approval audit' })]); });
    const state = map({ branch, actors: f.actors });
    return state;
}
export async function prepare(remote: DB, kind: string) {
    const previousUrl = process.env.DATABASE_URL, previousMode = process.env.NODE_ENV;
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = 'test';
    const f: any = kind.startsWith('doorstep') ? await vehicleFixture() : kind === 'service' ? await serviceFixture() : kind === 'bulk' ? await bulkFixture() : await orderFixture();
    try {
        await actorSetup(f);
        if (kind === 'service')
            f.booking = await begin(f);
        if (kind === 'bulk') {
            await f.call('driver', 'bulk.return.declare', { loadId: (f.load = await f.issue()).id, version: 1, returnGrams: 9000, reason: 'SANDBOX synthetic discrepancy only', operationKey: randomUUID() });
            await f.call('inventory', 'bulk.return.receive', { loadId: f.load.id, version: 2, returnGrams: 9000, reason: 'SANDBOX synthetic return evidence only', operationKey: randomUUID() });
        }
        if (kind === 'doorstep-gas') {
            await f.consent();
            f.prepared = await f.prepare();
            f.amendmentContext = f.context;
        }
        if (kind === 'doorstep-products') {
            const common = { evidence: label, reason: label };
            const m = await f.run('inventory', 'manifest.issue', { tripId: f.trip.id, productId: 'hose', quantity: 3, unitWeightGrams: 500, ...common });
            await f.run('driver', 'manifest.acknowledge', { manifestId: m.id, version: 1, quantity: 3, serialIds: [], ...common });
            const o = await one(f.db, 'SELECT tracking_version FROM orders WHERE id=$1', [f.order.id]);
            const amendment = await f.run('driver', 'doorstep.products.propose', { orderId: f.order.id, version: Number(o!.tracking_version), items: [{ productId: 'hose', quantity: 2 }] });
            await f.run('customer', 'doorstep.consent', { orderId: f.order.id, amendmentId: amendment.id, consent: true });
            f.amendmentContext = { orderId: f.order.id, amendmentId: amendment.id, reason: label };
            f.prepared = await f.run('inventory', 'doorstep.products.prepare', { ...f.amendmentContext, allocations: [{ productId: 'hose', manifestId: m.id, serialIds: [] }] });
        }
        const branch = 'qa-admin-' + randomUUID().slice(0, 12);
        console.log('Importing labelled ' + kind + ' fixture ' + branch);
        const state = await importFixture(remote, f, branch);
        state.kind = kind;
        state.passwords = f.passwords;
        if (f.booking)
            state.booking = f.booking;
        if (f.order)
            state.order = f.order;
        if (f.prepared)
            state.prepared = f.prepared;
        if (f.amendmentContext)
            state.amendmentContext = f.amendmentContext;
        if (f.load)
            state.load = f.load;
        if (f.trip)
            state.trip = f.trip;
        if (f.vehicle)
            state.vehicle = f.vehicle;
        return state;
    }
    finally {
        await f.db.close?.();
        process.env.DATABASE_URL = previousUrl;
        process.env.NODE_ENV = previousMode;
    }
}
export async function saveState(state: any) { await writeFile(privateFile, JSON.stringify(state, null, 2), { mode: 0o600 }); }
export const hash = (x: any) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
