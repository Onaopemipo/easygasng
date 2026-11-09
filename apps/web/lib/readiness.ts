import { one, type SQL } from "./db";
import { requiredSchemaVersions, operationalHealth } from "./release-checks";
import { allow, type Actor } from "./auth";
export async function readiness(tx: SQL, user: Actor) {
  allow(user, ["owner"]);
  const count = async (q: string) => Number((await one(tx, q))!.n);
  const schema = (
    await tx.query("SELECT version FROM schema_migrations ORDER BY version")
  ).rows.map((r) => r.version);
  const policies = await count(
    "SELECT count(*)::int n FROM legal_documents WHERE published=true AND effective_at<=now()",
  );
  const services = await count(
    "SELECT count(*)::int n FROM service_catalogue WHERE (config->>'active')::boolean=true AND checklist_version>0",
  );
  const staff = await count(
    "SELECT count(*)::int n FROM users WHERE role='owner' AND active=true",
  );
  const stock = await count(
    "SELECT count(*)::int n FROM inventory WHERE published=true AND price_kobo>0 AND quantity-reserved>0",
  );
  const incidents = await count(
    "SELECT count(*)::int n FROM operational_incidents WHERE status<>'resolved' AND severity IN ('high','critical')",
  );
  const gate = (
    id: number,
    name: string,
    status: string,
    evidence: string,
  ) => ({ id, name, status, evidence });
  return {
    recommendation: "NO-GO",
    checkedAt: new Date().toISOString(),
    gates: [
      gate(
        1,
        "Reviewed release scope",
        "unverified",
        "Owner-approved release scope and reviewed source baseline are required.",
      ),
      gate(
        2,
        "Web build and CI",
        "unverified",
        "Run the documented build against the reviewed release revision; source code alone does not prove this deployment.",
      ),
      gate(
        3,
        "Native distribution",
        "unverified",
        "Hermes exports are available; signed device builds, identifiers, permissions and store approval require verification.",
      ),
      gate(
        4,
        "Database schema",
        requiredSchemaVersions.every((v) => schema.includes(v))
          ? "pass"
          : "blocked",
        "All application migrations and runtime policies through 056 required. Current versions: " +
          schema.join(", "),
      ),
      gate(
        5,
        "Managed database and TLS",
        process.env.DATABASE_URL ? "unverified" : "blocked",
        process.env.DATABASE_URL
          ? "A connection is configured; restricted identity, advisors, TLS and staging acceptance still require evidence."
          : "Local database only; hosted provisioning is not authorised.",
      ),
      gate(
        6,
        "Production origin",
        process.env.APP_URL?.startsWith("https://") ? "unverified" : "blocked",
        "A verified HTTPS origin, certificate and hosting configuration are required.",
      ),
      gate(
        7,
        "Independent business authority",
        staff >= 2 ? "unverified" : "blocked",
        staff +
          " active owner account(s); independent policy and sensitive approvals require sufficient verified people.",
      ),
      gate(
        8,
        "Reviewed customer policies",
        policies === 9 ? "unverified" : "blocked",
        policies +
          " of 9 policies published and effective; legal/business review and acceptance evidence remain necessary.",
      ),
      gate(
        9,
        "Physical inventory",
        stock > 0 ? "unverified" : "blocked",
        stock +
          " published stocked lines; reconcile physical counts and serial eligibility before sale.",
      ),
      gate(
        10,
        "Qualified service operation",
        services > 0 ? "unverified" : "blocked",
        services +
          " active services with approved checklist; verify actual qualifications, areas, equipment and field processes.",
      ),
      gate(
        11,
        "Online payments",
        "disabled",
        "Unconnected by user decision. Do not advertise or activate online payment.",
      ),
      gate(
        12,
        "Cash and credit reconciliation",
        "unverified",
        "Finance must verify counted cash, liability balances and refund controls against real records.",
      ),
      gate(
        13,
        "Notification providers",
        process.env.EASYGAS_EMAIL_ENABLED === "true" ? "unverified" : "blocked",
        "Transactional SMTP adapter exists behind an OFF flag. Verified sender, real recovery delivery, provider monitoring and outage acceptance remain required. In-app notifications are persisted.",
      ),
      gate(
        14,
        "Authentication and security",
        "unverified",
        "Local tests cover sessions, ownership and role/branch controls. Independent assessment, abuse/load testing and native toolchain advisories remain.",
      ),
      gate(
        15,
        "Multi-connection concurrency",
        "unverified",
        "Isolated PostgreSQL concurrency and uncertain-COMMIT tests passed. Run against the reviewed deployment revision and capacity before release.",
      ),
      gate(
        16,
        "Backups and restore",
        "unverified",
        "Encrypted local restore tests pass; managed/off-site backups, retention, recovery objectives and production restore drill are required.",
      ),
      gate(
        17,
        "Monitoring and incidents",
        incidents ? "blocked" : "unverified",
        incidents +
          " unresolved high/critical incidents. External health/error alerting and on-call ownership must be configured.",
      ),
      gate(
        18,
        "Workers and recovery",
        "unverified",
        (await operationalHealth(tx))
          ? "Worker heartbeat is current. Supervision and restart/failure drill still require deployment acceptance."
          : "Worker heartbeat missing/stale or schema incomplete. Configure and supervise the worker before serving traffic.",
      ),
      gate(
        19,
        "Privacy and retention",
        "blocked",
        "Owned export and request intake exist. Verified erasure/retention and incident fulfilment processes remain incomplete.",
      ),
      gate(
        20,
        "Acceptance and authorisation",
        "blocked",
        "Business, finance, qualified safety reviewers and operations must accept their scope; production release requires explicit user authorisation.",
      ),
    ],
  };
}
