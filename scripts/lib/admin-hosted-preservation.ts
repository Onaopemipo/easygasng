import { writeFile, readFile } from 'node:fs/promises';
import { hash, out } from './admin-hosted-fixture';
import type { DB } from '../../apps/web/lib/db';
export async function capture(db: DB, state: any, name: string) {
    const normalizeOnly=name==='after-normalized';
    const names = (await db.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='easygas_private' AND c.relkind='r' ORDER BY c.relname")).rows.map(r => r.relname);
    const cols = (await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='easygas_private'")).rows;
    const records: any[] = [];
    for (let i = 0; i < names.length; i += 3)
        records.push(...await Promise.all(names.slice(i, i + 3).map(async (t) => { const fields = cols.filter(c => c.table_name === t && (/(^id$|_id$|_by$|^scope$|^key$|^target$|^source_branch$|^destination_branch$|^reference$|^dedupe_key$|^recipient$|^email$)/.test(c.column_name))).map(c => c.column_name); const refs = fields.length ? 'jsonb_build_object(' + fields.map(k => "'" + k + "',r.\"" + k + "\"").join(',') + ')' : "'{}'::jsonb"; return { t, rows: (await db.query('SELECT ' + refs + " AS v,"+(normalizeOnly?'NULL':"md5((to_jsonb(r)-'driver_last_seen_at'-'last_heartbeat_at')::text)")+" AS h FROM \"" + t + '\" r')).rows.map(x => ({ ...x.v, __originalHash: x.h })) }; })));
    const known = new Set<string>();
    for (const f of Object.values<any>(state.fixtures)) {
        known.add(f.branch);
        for (const a of Object.values<any>(f.actors))
            known.add(a.id);
    }
    for (const b of records.filter(b => b.t === 'settings'))
        for (const row of b.rows)
            if (known.has(row.scope) && /[a-f0-9]{8}-[a-f0-9]{4}-/.test(row.key))
                known.add(row.key);
    const hits = (v: any): boolean => typeof v === 'string' ? known.has(v) || [...known].some(k => k.length >= 24 && v.includes(k)) : Array.isArray(v) ? v.some(hits) : v && typeof v === 'object' ? Object.values(v).some(hits) : false;
    for (let pass = 0; pass < 10; pass++) {
        let changed = false;
        for (const b of records)
            for (const row of b.rows)
                if (hits(row) && typeof row.id === 'string' && !known.has(row.id)) {
                    known.add(row.id);
                    changed = true;
                }
        if (!changed)
            break;
    }
    const result: any = { runId: state.runId, status: 'CAPTURED', capturedAt:new Date().toISOString(), tables: {}, excludedFixtureBranches: Object.values<any>(state.fixtures).map(f => f.branch) };
    // Fingerprints omit only the two documented live heartbeat timestamp fields.
    if(!normalizeOnly)for (const b of records) {
        const rows = b.rows.filter(r => !hits(r));
        result.tables[b.t] = { count: rows.length, hash: hash(rows.map(r => r.__originalHash).sort()) };
    }
    if(name==='after-normalized'){
        const before=JSON.parse(await readFile(out+'before.json','utf8'));
        const cut=before.capturedAt;
        const old=(await db.query("SELECT id,actor_id,target,md5((to_jsonb(r)-'driver_last_seen_at'-'last_heartbeat_at')::text) AS __originalHash FROM audit_events r WHERE created_at<=$1",[cut])).rows.filter(r=>!hits(r));
        result.metadataAuditReconstruction={cutoff:cut,baselineCount:before.tables.audit_events.count,reconstructedCount:old.length,originalRowsMatch:old.length===before.tables.audit_events.count&&hash(old.map(r=>r.__originalhash??r.__originalHash).sort())===before.tables.audit_events.hash};
    }
    await writeFile(out + name + '.json', JSON.stringify(result, null, 2) + '\n');
    return result;
}
