/** Local, offline image checks. Never mounts repository files or production secrets. */
import { spawnSync } from "node:child_process";

const image = process.argv[2];
if (!image || !/^easygas:local-acceptance-[a-zA-Z0-9_.-]+$/.test(image))
  throw new Error(
    "Supply an explicitly tagged easygas:local-acceptance-* image.",
  );
function run(args: string[]) {
  const result = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: 60_000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}
const isolation = run([
  "run",
  "--rm",
  "--network",
  "none",
  "--read-only",
  "--cap-drop",
  "ALL",
  "--security-opt",
  "no-new-privileges",
  "--entrypoint",
  "node",
  image,
  "-e",
  `const fs=require('fs'); const checks={
    nonRoot:process.getuid()!==0,
    noRootEnv:!fs.existsSync('/app/.env'),
    noWebEnv:!fs.existsSync('/app/apps/web/.env.local'),
    noLocalDatabase:!fs.existsSync('/app/.data'),
    noMobileCredentials:!fs.existsSync('/app/.data/mobile-demo-credentials.json'),
    hasBuild:fs.existsSync('/app/apps/web/.next/BUILD_ID'),
    hasWorker:fs.existsSync('/app/scripts/worker.ts')
  }; console.log(JSON.stringify(checks));
  if(Object.values(checks).includes(false))process.exit(1);`,
]);
if (isolation.status !== 0)
  throw new Error("Image isolation/runtime-file check failed.");
console.log("CONTAINER-01 PASS", isolation.stdout.trim());
const rejected = run([
  "run",
  "--rm",
  "--network",
  "none",
  "--read-only",
  "--tmpfs",
  "/tmp:rw,noexec,nosuid,size=16m",
  "--cap-drop",
  "ALL",
  "--security-opt",
  "no-new-privileges",
  image,
]);
if (
  rejected.status !== 1 ||
  !rejected.stdout.includes('"technicalChecksPassed": false') ||
  !rejected.stdout.includes('"id": "database-tls"') ||
  !rejected.stdout.includes("NO-GO until")
)
  throw new Error("Unconfigured image did not reject release as expected.");
console.log(
  "CONTAINER-02 PASS: missing production configuration rejected before app startup.",
);
console.log(
  "Local image checks only. Compose, live TLS/DB, worker, restore, load and release approval remain required.",
);
