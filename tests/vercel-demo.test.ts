import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
test("VDEMO-SEC01: Source bundle excludes local environment and data files", async () => {
  const ignore = await readFile(".vercelignore", "utf8");
  for (const line of [
    ".env*",
    "**/.env*",
    ".data",
    "**/.data",
    ".backups",
    "apps/mobile",
    "docs",
    "tests",
    "scripts",
    "*.egbackup",
  ])
    assert.ok(ignore.split("\n").includes(line), line);
});
test("VDEMO-SEC02: hosted demo bootstrap fails before connecting without explicit dedicated-resource confirmation", () => {
  const env = { ...process.env };
  delete env.EASYGAS_DEMO_PROVISION;
  delete env.EASYGAS_DEMO_ENV_FILE;
  delete env.EASYGAS_DEMO_CREDENTIAL_FILE;
  const run = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/prepare-vercel-demo.ts"],
    { env, encoding: "utf8" },
  );
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /Explicit isolated demo provisioning required/);
});
