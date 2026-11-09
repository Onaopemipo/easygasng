import { doorstepFixture } from "./doorstep-fixture";
import { type DB } from "../../apps/web/lib/db";
import { id } from "../../apps/web/lib/auth";
export async function vehicleFixture(database?: DB) {
  const f = await doorstepFixture(database);
  await f.db.query(
    "UPDATE driver_vehicles SET physical_capacity_grams=20000 WHERE id=$1",
    [f.vehicle.id],
  );
  await f.call("owner", "technician.qualify", {
    userId: f.actors.inventory.id,
    code: "inventory_safety",
    evidence: "Synthetic independently verified inventory safety",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  });
  const run = (role: string, action: string, data: any) =>
    f.call(role, action, { ...data, operationKey: id() });
  return { ...f, run };
}
export function restoreVehicleEnv(env: NodeJS.ProcessEnv) {
  for (const k of ["EASYGAS_DOORSTEP_ENABLED", "EASYGAS_BULK_LPG_ENABLED"])
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
}
