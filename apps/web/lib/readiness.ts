import { z } from "zod";
import { audit } from "./governance";
import { one, type SQL } from "./db";
import {
  requiredSchemaVersions,
  operationalHealth,
  isHostedClientDemo,
} from "./release-checks";
import recordedRelease from "./readiness-release-evidence.json";
import { allow, recentVerification, id, AppError, type Actor } from "./auth";
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
  const financeStaff = await count(
    "SELECT count(*)::int n FROM users WHERE role='finance' AND active=true",
  );
  const gateway = await one(
    tx,
    "SELECT value FROM settings WHERE key='payment.gateway' AND scope='lagos'",
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
    environmentScope:
      process.env.EASYGAS_CLIENT_DEMO === "true"
        ? "client_demo"
        : "production_candidate",
    recordedRelease,
    reviews: (
      await tx.query(
        "SELECT id,target,detail,created_at FROM audit_events WHERE action='readiness.reviewed' ORDER BY created_at DESC,id DESC LIMIT 100",
      )
    ).rows,
    checkedAt: new Date().toISOString(),
    gates: [
      gate(
        1,
        "Reviewed release scope",
        "partial",
        "The owner-authorised client-demo release has a reviewed committed source baseline. Commercial launch capabilities and business acceptance still require explicit approval; demo scope is not production scope.",
      ),
      gate(
        2,
        "Web build and CI",
        "partial",
        `Recorded client-demo baseline: ${recordedRelease.ciTests.passed.toLocaleString("en-US")} tests passed, zero failures/skips; web build/types/audits and native checks passed, mobile export skipped. CI ${recordedRelease.ciSource}; application source ${recordedRelease.applicationSource}. This historical evidence does not certify later source changes or a commercial production deployment.`,
      ),
      gate(
        3,
        "Native distribution",
        "unverified",
        "Native source and representative simulator/API checks exist. No new mobile binaries were created by the latest demo publication; signed physical-device, lifecycle/offline, identifiers, permissions and distribution acceptance remain open.",
      ),
      gate(
        4,
        "Database schema",
        requiredSchemaVersions.every((v) => schema.includes(v))
          ? "pass"
          : "blocked",
        `All ${requiredSchemaVersions.length} required application migration versions through ${requiredSchemaVersions.at(-1)} are checked. Current versions: ` +
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
        staff >= 1 ? "unverified" : "blocked",
        staff +
          " active Admin/business owner account(s), " +
          financeStaff +
          " active Inventory/finance account(s). One business owner is supported. Restricted actions still require distinct eligible reviewers; verify maker, reviewer and executor responsibilities for the actual staff and branches.",
      ),
      gate(
        8,
        "Reviewed customer policies",
        policies === 9 ? "unverified" : "blocked",
        policies +
          " of 9 policies published and effective. Demo-only notices do not establish approved commercial terms; legal/business review and acceptance evidence remain necessary.",
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
        gateway?.value?.enabled ? "unverified" : "disabled",
        gateway?.value?.enabled
          ? "The configured gateway is enabled for sandbox/test payments only. Live merchant ownership, provider acceptance and commercial release remain unverified."
          : "The configured payment gateway is disabled. Do not advertise online payment until the approved provider and release gates are satisfied.",
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
        "Role, branch and ownership regressions and the recorded web/native dependency audits passed for the client-demo baseline. Independent production security assessment, abuse/load tests and a fresh audit of the final release revision remain required; historical advisory counts are not a current vulnerability finding.",
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
        isHostedClientDemo(process.env)
          ? "This isolated client demo intentionally disables background jobs and has no supervised worker. That is demo configuration, not a production worker outage. Commercial hosting still needs supervised jobs, current heartbeat and restart/failure acceptance."
          : (await operationalHealth(tx))
            ? "Worker heartbeat is current. Supervision and restart/failure drill still require deployment acceptance."
            : "Worker heartbeat missing/stale or schema incomplete. Configure and supervise the worker before serving traffic.",
      ),
      gate(
        19,
        "Privacy and retention",
        "blocked",
        "Owned export and deletion-review intake exist. The explicit retain-all policy keeps records and reports retained disposition; destructive erasure is not authorised. Independent commercial policy review, retention/access handling and an off-site restore drill preserving the hold remain outstanding.",
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

/** Evidence intake never changes a gate or the production recommendation. */
export async function reviewReadiness(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["owner"]);
  recentVerification(user);
  const d = z
    .object({
      gateId: z.number().int().positive(),
      evidence: z.string().trim().min(20).max(2000),
      reason: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(input);
  const state = await readiness(tx, user),
    gate = state.gates.find((g) => g.id === d.gateId);
  if (!gate) throw new AppError(404, "Release gate not found.");
  const reference = id();
  await audit(tx, user, "readiness.reviewed", String(gate.id), "success", {
    reference,
    gate: gate.name,
    status: gate.status,
    evidence: d.evidence,
    reason: d.reason,
    productionDecision: "NO-GO",
  });
  return {
    reference,
    message: "Evidence review recorded. Production release remains NO-GO.",
  };
}
