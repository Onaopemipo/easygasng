// Read-only deployment gate for the existing demo. This never applies migrations.
import { readFile } from "node:fs/promises";
import { createDatabase, one } from "./apps/web/lib/db";
if (process.env.EASYGAS_CLIENT_DEMO !== "true" || process.env.APP_URL !== "https://easygas-client-demo.vercel.app" || !process.env.DATABASE_URL)
  throw Error("Restricted to the existing EasyGas client demo.");
const db = await createDatabase();
try {
  if (!(await one(db, "SELECT version FROM schema_migrations WHERE version='085'")))
    throw Error("Apply reviewed migration085 before publishing Admin single approval.");
  const expected = (await readFile("database/migrations/085_admin_single_approval.sql", "utf8")).split("LANGUAGE plpgsql AS $$")[1].split("$$;")[0].trim();
  const state = await one(db, `SELECT
    (SELECT p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=current_schema() AND p.proname='admin_final_review_guard') AS body,
    (SELECT count(*)::int FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=current_schema() AND t.tgenabled='O' AND (c.relname,t.tgname) IN
      (('invoice_notes','invoice_notes_admin_review'),('product_compatibility','product_compatibility_admin_review'),('recommendation_rules','recommendation_rules_admin_review'))) AS guards,
    (SELECT count(*)::int FROM pg_constraint WHERE contype='c' AND conrelid IN ('invoice_notes'::regclass,'product_compatibility'::regclass,'recommendation_rules'::regclass)
      AND (pg_get_constraintdef(oid) LIKE '%approved_by <> requested_by%' OR pg_get_constraintdef(oid) LIKE '%proposed_by <> reviewed_by%' OR pg_get_constraintdef(oid) LIKE '%created_by <> reviewed_by%')) AS obsolete,
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='invoice_notes'::regclass AND tgname='invoice_notes_guard' AND tgenabled='O') AS immutable,
    has_schema_privilege(current_user,current_schema(),'CREATE') AS ddl`);
  if (state?.body?.trim() !== expected || state.guards !== 3 || state.obsolete !== 0 || !state.immutable || state.ddl)
    throw Error("Admin single-approval schema085, immutable history or restricted-runtime checks failed.");
  console.log("Read-only Admin schema085, exact review guard, immutable-history and restricted-runtime checks passed.");
} finally { await db.close?.(); }
