// Local-only disposable UI acceptance preview. Run from the repository root.
import next from "next";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const qa = JSON.parse(
  await readFile(
    new URL("../.data/growth-compact-qa.json", import.meta.url),
    "utf8",
  ),
);
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw new Error("Local fixture only");
process.env.EASYGAS_DATA_DIR = qa.db;
process.env.EASYGAS_GROWTH_PREVIEW = "true";
const app = next({
  dev: true,
  hostname: "127.0.0.1",
  port: 3115,
  dir: "apps/web",
  conf: {
    distDir: ".next-growth-compact",
    serverExternalPackages: ["@electric-sql/pglite", "pg"],
  },
});
await app.prepare();
// Next loads .env.local during prepare; refuse a database URL loaded at that point too.
if (process.env.DATABASE_URL) throw new Error("Local fixture only");
createServer(app.getRequestHandler()).listen(3115, "127.0.0.1", () =>
  console.log("Growth admin preview ready: http://127.0.0.1:3115"),
);
