import "./environment";
import { createDatabase } from "../apps/web/lib/db";
import {
  environmentChecks,
  databaseChecks,
} from "../apps/web/lib/release-checks";
const checks = environmentChecks(process.env);
if (checks.every((c) => c.ok)) {
  const db = await createDatabase();
  try {
    checks.push(...(await databaseChecks(db)));
  } catch {
    checks.push({
      id: "database-access",
      ok: false,
      detail:
        "Database release checks failed. Inspect protected infrastructure logs; no secrets are printed.",
    });
  } finally {
    await db.close?.();
  }
}
console.log(
  JSON.stringify(
    {
      technicalChecksPassed: checks.every((c) => c.ok),
      releaseDecision:
        "NO-GO until business, operational and release acceptance gates are signed",
      checks,
    },
    null,
    2,
  ),
);
process.exitCode = checks.every((c) => c.ok) ? 0 : 1;
