import "./environment";
import { createDatabase, migrate } from "../apps/web/lib/db";
const db = await createDatabase();
await migrate(db);
console.log("Database migrations applied.");
process.exit(0);
