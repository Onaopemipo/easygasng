import { readFileSync } from "node:fs";
import { parse, toClientConfig } from "pg-connection-string";
import { checkServerIdentity } from "node:tls";

// Validate before parsing: pg-connection-string may read certificate paths.
// An environment default must never override an explicit, weaker URL option.
export function databaseTlsConfigured(env: NodeJS.ProcessEnv): boolean {
  try {
    const url = new URL(env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(url.protocol)) return false;
    if (env.NODE_TLS_REJECT_UNAUTHORIZED === "0") return false;
    if (env.PGSSLMODE && env.PGSSLMODE !== "verify-full") return false;
    const seen = new Set<string>();
    for (const [key, value] of url.searchParams) {
      const lower = key.toLowerCase();
      if (seen.has(lower)) return false;
      seen.add(lower);
      if (key !== lower) return false;
      if (lower === "sslmode" && value !== "verify-full") return false;
      if (["ssl", "uselibpqcompat", "sslnegotiation"].includes(lower))
        return false;
      if (
        (lower.startsWith("ssl") || lower.includes("rejectunauthorized")) &&
        !["sslmode", "sslrootcert", "sslcert", "sslkey"].includes(lower)
      )
        return false;
      if (["host", "hostaddr"].includes(lower)) return false;
    }
    return (
      url.searchParams.get("sslmode") === "verify-full" ||
      env.PGSSLMODE === "verify-full"
    );
  } catch {
    return false;
  }
}

export function verifiedDatabaseConfig(env: NodeJS.ProcessEnv) {
  if (!databaseTlsConfigured(env))
    throw new Error(
      "Production database TLS requires certificate and hostname verification; remove conflicting connection options.",
    );
  const parsed = parse(env.DATABASE_URL!);
  const ssl = typeof parsed.ssl === "object" ? parsed.ssl : {};
  const certificate = ssl.cert ?? undefined;
  // Pass parsed fields directly. A connectionString would be parsed a second
  // time by pg and could replace this explicit verified TLS configuration.
  return {
    ...toClientConfig(parsed),
    ssl: {
      ...ssl,
      ca:
        ssl.ca ??
        (env.PGSSLROOTCERT
          ? readFileSync(env.PGSSLROOTCERT, "utf8")
          : undefined),
      cert: certificate,
      rejectUnauthorized: true,
      checkServerIdentity,
    },
  };
}
