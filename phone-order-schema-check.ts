// Existing-demo build prerequisite. Read-only: the runtime never performs DDL.
import { createDatabase, one } from "./apps/web/lib/db";
if (
  process.env.EASYGAS_CLIENT_DEMO !== "true" ||
  process.env.APP_URL !== "https://easygas-client-demo.vercel.app" ||
  !process.env.DATABASE_URL
)
  throw Error("Restricted to the existing client demo.");
const db = await createDatabase();
try {
  if (
    !(await one(
      db,
      "SELECT version FROM schema_migrations WHERE version='083'",
    ))
  )
    throw Error(
      "Apply reviewed operator migration083 before publishing phone-order payments.",
    );
  const s = await one(
    db,
    "SELECT (SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='phone_order_payment_links'::regclass) forced,has_table_privilege(current_user,'phone_order_payment_links','SELECT') AND has_table_privilege(current_user,'phone_order_payment_links','INSERT') AND has_table_privilege(current_user,'phone_order_payment_links','UPDATE') permitted,has_table_privilege(current_user,'phone_order_payment_links','DELETE') can_delete,has_schema_privilege(current_user,current_schema(),'CREATE') ddl,has_column_privilege(current_user,'orders','address','UPDATE') AND has_column_privilege(current_user,'orders','payment_method','UPDATE') columns",
  );
  if (!s?.forced || !s.permitted || !s.columns || s.can_delete || s.ddl)
    throw Error(
      "Phone-order schema requires forced RLS, narrow runtime permissions and no delete/DDL.",
    );
  console.log(
    "Read-only phone-order schema083/RLS/minimum runtime grants verified.",
  );
} finally {
  await db.close?.();
}
