import path from "node:path";
try {
  process.loadEnvFile(path.resolve("apps/web/.env.local"));
} catch (error: any) {
  if (error.code !== "ENOENT") throw error;
}
