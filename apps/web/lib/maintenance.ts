import { escalateSupportSla } from "./support-desk";
import { publishTrackingNotifications } from "./order-tracking";
import { recordFailure } from "./observability";
import { type DB, one } from "./db";
import { type Actor } from "./auth";
const state = globalThis as unknown as {
  easygasMaintenance?: ReturnType<typeof setInterval>;
  easygasMaintenanceBusy?: boolean;
};
export function startMaintenance(db: DB) {
  if (
    process.env.EASYGAS_BACKGROUND_JOBS === "false" ||
    state.easygasMaintenance
  )
    return;
  state.easygasMaintenance = setInterval(async () => {
    if (state.easygasMaintenanceBusy) return;
    state.easygasMaintenanceBusy = true;
    try {
      await db.transaction(publishTrackingNotifications);
      const owner = await one(
        db,
        "SELECT id,name,email,role,branch_id FROM users WHERE role='owner' AND active=true ORDER BY created_at LIMIT 1",
      );
      if (owner) {
        const { runJobs } = await import("./refills");
        await db.transaction(tx => escalateSupportSla(tx, { ...owner, verified_at: null, session_id: "background-maintenance" } as Actor));
        await db.transaction((tx) =>
          runJobs(tx, {
            ...owner,
            verified_at: null,
            session_id: "background-maintenance",
          } as Actor),
        );
      }
    } catch (error) {
      await recordFailure(
        db,
        "maintenance_failure",
        new Date().toISOString().slice(0, 13),
        error instanceof Error ? error.name : "unknown",
      );
      console.error("EasyGas maintenance failed", {
        type: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      state.easygasMaintenanceBusy = false;
    }
  }, 60000);
  state.easygasMaintenance.unref();
}
