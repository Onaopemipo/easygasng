import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("DRVS-CONFIG: nested local driver shell resolves inherited plugins and still rejects non-local build profiles", async () => {
  const { execFileSync } = await import("node:child_process");
  const env = {
    ...process.env,
    EAS_BUILD_PROFILE: "local-demo",
    EXPO_PUBLIC_API_URL: "http://127.0.0.1:3098",
  };
  const plugins = JSON.parse(
    execFileSync(
      process.execPath,
      [
        "-e",
        "console.log(JSON.stringify(require('./apps/mobile/driver/app.config.js').plugins))",
      ],
      { env, encoding: "utf8" },
    ),
  );
  const paths = plugins
    .map((p: any) => (Array.isArray(p) ? p[0] : p))
    .filter((p: string) => p.includes("/plugins/"));
  assert.equal(paths.length, 2);
  for (const p of paths) {
    assert.ok(p.includes("/apps/mobile/plugins/"));
    assert.ok(!p.includes("/driver/plugins/"));
    await readFile(p + ".js");
  }
  assert.throws(() =>
    execFileSync(
      process.execPath,
      ["-e", "require('./apps/mobile/driver/app.config.js')"],
      { env: { ...env, EAS_BUILD_PROFILE: "preview" }, stdio: "pipe" },
    ),
  );
});
