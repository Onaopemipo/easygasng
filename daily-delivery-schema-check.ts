// Read-only release gate. The application never applies shared-database migrations.
import { createDatabase, one } from "./apps/web/lib/db";
if (
  process.env.EASYGAS_CLIENT_DEMO !== "true" ||
  process.env.APP_URL !== "https://easygas-client-demo.vercel.app" ||
  !process.env.DATABASE_URL
)
  throw Error("Restricted to the existing EasyGas client demo.");
const db = await createDatabase();
try {
  if (
    !(await one(
      db,
      "SELECT version FROM schema_migrations WHERE version='086'",
    ))
  )
    throw Error(
      "Apply reviewed migration086 before publishing daily delivery.",
    );
  const tables = [
    "daily_delivery_runs",
    "daily_delivery_allocations",
    "daily_delivery_refills",
    "daily_delivery_weights",
  ];
  for (const table of tables) {
    const s = await one(
      db,
      `SELECT relrowsecurity AND relforcerowsecurity forced,has_table_privilege(current_user,oid,'SELECT') AND has_table_privilege(current_user,oid,'INSERT') permitted,has_table_privilege(current_user,oid,'DELETE') can_delete FROM pg_class WHERE oid=$1::regclass`,
      [table],
    );
    if (!s?.forced || !s.permitted || s.can_delete)
      throw Error(
        "Daily delivery RLS/minimum runtime permissions failed: " + table,
      );
  }
  const s = await one(
    db,
    `SELECT has_schema_privilege(current_user,current_schema(),'CREATE') ddl,
 (SELECT count(*)::int FROM pg_trigger WHERE tgenabled='O' AND tgname IN ('daily_run_guard','daily_allocation_guard','daily_refills_immutable','daily_weights_immutable') AND tgrelid=ANY(ARRAY['daily_delivery_runs'::regclass,'daily_delivery_allocations'::regclass,'daily_delivery_refills'::regclass,'daily_delivery_weights'::regclass])) guards,
 has_column_privilege(current_user,'daily_delivery_runs','opening_grams','UPDATE') opening_update,
 has_table_privilege(current_user,'daily_delivery_refills','UPDATE') refill_update,
 has_table_privilege(current_user,'daily_delivery_weights','UPDATE') weights_update,
 has_column_privilege(current_user,'daily_delivery_runs','committed_grams','UPDATE') counters,
 has_column_privilege(current_user,'daily_delivery_allocations','state','UPDATE') allocations`,
  );
  if (
    s?.ddl ||
    s?.guards !== 4 ||
    s?.opening_update ||
    s?.refill_update ||
    s?.weights_update ||
    !s?.counters ||
    !s?.allocations
  )
    throw Error(
      "Daily delivery immutable-history/restricted-runtime guard failed.",
    );
  console.log(
    "Read-only daily schema086, forced RLS, immutable measurement history and narrow runtime grants verified.",
  );
} finally {
  await db.close?.();
}
