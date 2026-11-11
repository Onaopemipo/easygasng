import { databaseTlsConfigured } from "./database-tls";
import { type SQL } from "./db";
export const requiredSchemaVersions = Array.from({ length: 76 }, (_, i) =>
  String(i + 1).padStart(3, "0"),
).filter((v) => v !== "026");
// 026 was never issued; 027 is the next historical migration.
export type ReleaseCheck = { id: string; ok: boolean; detail: string };
export function environmentChecks(env: NodeJS.ProcessEnv): ReleaseCheck[] {
  const checks: ReleaseCheck[] = [];
  const add = (id: string, ok: boolean, detail: string) =>
    checks.push({ id, ok, detail });
  let origin: URL | undefined, database: URL | undefined;
  try {
    origin = new URL(env.APP_URL ?? "");
  } catch {}
  try {
    database = new URL(env.DATABASE_URL ?? "");
  } catch {}
  const local = (host: string) =>
    ["localhost", "127.0.0.1", "[::1]"].includes(host);
  add(
    "origin",
    !!origin &&
      origin.protocol === "https:" &&
      !local(origin.hostname) &&
      !origin.username &&
      !origin.password &&
      origin.pathname === "/" &&
      !origin.search &&
      !origin.hash,
    "Use the canonical public HTTPS origin without credentials, path or query.",
  );
  add(
    "database",
    !!database &&
      ["postgres:", "postgresql:"].includes(database.protocol) &&
      !local(database.hostname) &&
      database.pathname.length > 1,
    "Production requires a dedicated PostgreSQL database.",
  );
  add(
    "database-tls",
    databaseTlsConfigured(env),
    "Require certificate and hostname verification (sslmode=verify-full); never disable TLS verification.",
  );
  add(
    "worker",
    env.EASYGAS_BACKGROUND_JOBS === "false",
    "Use one supervised external worker; disable the in-process timer.",
  );
  add(
    "preview",
    env.EASYGAS_PREVIEW !== "true" && env.EASYGAS_CLIENT_DEMO !== "true",
    "Do not release a QA or client demo build.",
  );
  add(
    "release",
    /^[a-f0-9]{40}$/i.test(env.EASYGAS_RELEASE_SHA ?? ""),
    "Supply the reviewed 40-character Git revision as EASYGAS_RELEASE_SHA.",
  );
  add(
    "transactional-mail",
    env.EASYGAS_EMAIL_ENABLED === "true" &&
      /^[a-z0-9.-]+$/i.test(env.SMTP_HOST ?? "") &&
      ["465", "587"].includes(env.SMTP_PORT ?? "") &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.SMTP_FROM ?? "") &&
      !!env.SMTP_USER &&
      !!env.SMTP_PASSWORD,
    "Configure an approved authenticated TLS SMTP sender and verify actual recovery delivery before launch.",
  );
  return checks;
}
export async function databaseChecks(tx: SQL): Promise<ReleaseCheck[]> {
  const versions = new Set(
    (await tx.query("SELECT version FROM schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );
  const missing = requiredSchemaVersions.filter((v) => !versions.has(v));
  const role = (
    await tx.query(
      "SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=current_user",
    )
  ).rows[0];
  const schema = (
    await tx.query(
      "SELECT has_schema_privilege(current_user,'easygas_private','CREATE') AS can_create",
    )
  ).rows[0];
  const owned = (
    await tx.query(
      "SELECT count(*)::int n FROM pg_tables WHERE schemaname='easygas_private' AND tableowner=current_user",
    )
  ).rows[0];
  const tls = (
    await tx.query("SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()")
  ).rows[0];
  const protection = (
    await tx.query(
      "SELECT count(*)::int n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='easygas_private' AND c.relkind IN ('r','p') AND (NOT c.relrowsecurity OR EXISTS(SELECT 1 FROM aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a WHERE a.grantee=0))",
    )
  ).rows[0];
  const publicSchema = (
    await tx.query(
      "SELECT count(*)::int n FROM pg_namespace n CROSS JOIN LATERAL aclexplode(COALESCE(n.nspacl,acldefault('n',n.nspowner))) a WHERE n.nspname='easygas_private' AND a.grantee=0",
    )
  ).rows[0];
  return [
    {
      id: "private-schema",
      ok: Number(protection?.n) === 0 && Number(publicSchema?.n) === 0,
      detail:
        "Every private table requires RLS and no PUBLIC table/schema grants.",
    },
    {
      id: "schema",
      ok: !missing.length,
      detail: missing.length
        ? "Missing migrations: " + missing.join(", ")
        : "All required migrations present.",
    },
    {
      id: "runtime-role",
      ok:
        !!role &&
        !role.rolsuper &&
        !role.rolbypassrls &&
        !role.rolcreatedb &&
        !role.rolcreaterole &&
        !schema?.can_create &&
        Number(owned?.n) === 0,
      detail:
        "Runtime must not own tables, create schema objects, bypass RLS or administer roles/databases.",
    },
    {
      id: "connection-tls",
      ok: tls?.ssl === true,
      detail:
        "The current database connection must use TLS; certificate verification is checked separately.",
    },
  ];
}
export async function operationalHealth(tx: SQL, now = Date.now()) {
  const versions = new Set(
    (await tx.query("SELECT version FROM schema_migrations")).rows.map(
      (r) => r.version,
    ),
  );
  if (requiredSchemaVersions.some((v) => !versions.has(v))) return false;
  const row = (
    await tx.query(
      "SELECT max(finished_at) AS finished_at FROM job_runs WHERE job='maintenance' AND status='completed'",
    )
  ).rows[0];
  const completed = row?.finished_at
    ? new Date(row.finished_at).getTime()
    : NaN;
  return (
    Number.isFinite(completed) &&
    now - completed >= -60000 &&
    now - completed <= 5 * 60000
  );
}
