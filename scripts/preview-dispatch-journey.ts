// Isolated loopback journey preview. Never connects to a hosted database.
import next from "next";
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { dispatchJourneyFixture } from "../tests/helpers/dispatch-journey-fixture";
import { hashPassword } from "../apps/web/lib/auth";
import { lagosDate } from "../packages/business-rules/src/dispatch-centre";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Disposable local fixture only");
const f = await dispatchJourneyFixture(),
  db = f.db,
  password = "Synthetic-journey-ui-only-123!";
const order = await f.make(true, "wallet", lagosDate());
await f.prepare(order);
for (const [role, actor] of Object.entries(f.actors))
  await db.query(
    "UPDATE users SET name=$1,email=$2,password_hash=$3,verified=true WHERE id=$4",
    [
      "Synthetic journey " + role,
      role + "@journey-ui.example.test",
      hashPassword(password),
      actor.id,
    ],
  );
(globalThis as any).easygasDb = Promise.resolve(db);
(globalThis as any).easygasLocalVersion = 84;
process.env.EASYGAS_BACKGROUND_JOBS = "false";
process.env.EASYGAS_CLIENT_DEMO = "true";
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: 3136,
  dir: "apps/web",
  conf: {
    distDir: ".next-dispatch-journey",
    serverExternalPackages: ["@electric-sql/pglite", "pg"],
  },
});
await app.prepare();
await writeFile(
  ".data/dispatch-journey-qa.json",
  JSON.stringify({
    password,
    orderId: order.id,
    reference: order.reference,
    vehicleId: f.vehicle.id,
    meterId: f.meter.id,
    actors: Object.fromEntries(
      Object.entries(f.actors).map(([role, a]) => [
        role,
        { id: a.id, email: role + "@journey-ui.example.test" },
      ]),
    ),
  }),
  { mode: 0o600 },
);
createServer(app.getRequestHandler()).listen(3136, "127.0.0.1", () =>
  console.log(
    "Synthetic journey QA ready at http://127.0.0.1:3136/admin/deliveries",
  ),
);
