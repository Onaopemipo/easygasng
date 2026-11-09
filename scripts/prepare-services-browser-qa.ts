// Isolated synthetic data only; never connects to business or hosted data.
import { fixture } from "../tests/helpers/service-fixture";
import { writeFile } from "node:fs/promises";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Only isolated local QA is permitted.");
const f = await fixture(".data/services-browser-qa-20261030");
for (const [role, a] of Object.entries(f.actors))
  await f.db.query("UPDATE users SET email=$1,name=$2 WHERE id=$3", [
    role + "@services-qa.example.test",
    "QA " + role,
    a.id,
  ]);
await writeFile(
  "/tmp/easygas-services-browser-fixture.json",
  JSON.stringify({ actors: f.actors, input: f.input() }, null, 2),
  { mode: 0o600 },
);
await f.db.close?.();
console.log(
  "Synthetic service browser fixture prepared in isolated .data directory.",
);
