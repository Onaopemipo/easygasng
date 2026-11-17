import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const mobile = fileURLToPath(new URL("../apps/mobile/", import.meta.url));
const require = createRequire(join(mobile, "package.json"));
const lock = JSON.parse(readFileSync(join(mobile, "package-lock.json"), "utf8"));
const review = JSON.parse(readFileSync(new URL("../docs/security/mobile-glob-review.json", import.meta.url), "utf8"));
const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith("/picomatch"));

test("MOBILE-DEP-01: every installed glob consumer uses the integrity-pinned reviewed security patch", () => {
  assert.ok(copies.length >= 5, "Expo, Metro, Jest and codegen need audited glob matchers");
  const manifest = JSON.parse(readFileSync(join(mobile, "package.json"), "utf8"));
  assert.equal(manifest.overrides.picomatch, `npm:${review.name}@${review.version}`);
  for (const [path, entry] of copies) {
    assert.equal(entry.name, review.name, path);
    assert.equal(entry.version, review.version, path);
    assert.equal(entry.integrity, review.integrity, path);
    const folder = join(mobile, path);
    const installed = JSON.parse(readFileSync(join(folder, "package.json"), "utf8"));
    assert.equal(installed.name, review.name, path);
    assert.equal(installed.version, review.version, path);
    const files = readdirSync(folder).filter(name => name.endsWith(".js"));
    files.push(...readdirSync(join(folder, "lib")).map(name => `lib/${name}`));
    assert.deepEqual(files.sort(), Object.keys(review.files).sort(), path);
    for (const [name, hash] of Object.entries(review.files)) {
      assert.equal(createHash("sha256").update(readFileSync(join(folder, name))).digest("hex"), hash, `${path}/${name}`);
    }
  }
});

test("MOBILE-DEP-02: malicious repeated extglobs finish in bounded processes for every installed copy", () => {
  const script = `
    const assert = require('node:assert/strict');
    const pm = require(process.argv[1]);
    const a = 'a'.repeat(80);
    const cases = [
      ['+(*a)', a + '!'], ['*(*a)', a + '!'],
      ['+(a*)', a + '/'], ['*(a*)', a + '/'],
      ['+(*)', a + '/'], ['*(*)', a + '/'],
      ['+(*)b', a + '!'], ['*(*)b', a + '!'],
      ['+(*a)c', a + '!'], ['+(a*b)', 'ab'.repeat(40) + '!'],
      ['+(**)', a + '/.'], ['+(**a)', a + '!'],
      ['+(@(*a))', a + '!'], ['+(?(*a))', a + '!']
    ];
    for (const options of [{}, {windows: true}, {capture: true}]) {
      for (const [pattern, input] of cases) assert.equal(pm.isMatch(input, pattern, options), false, pattern);
    }
  `;
  for (const [path] of copies) {
    const result = spawnSync(process.execPath, ["-e", script, join(mobile, path)], { timeout: 5000, encoding: "utf8" });
    assert.ifError(result.error);
    assert.equal(result.status, 0, `${path}: ${result.stderr}`);
  }
});

test("MOBILE-DEP-03: Metro glob APIs and codegen file discovery retain expected matching", () => {
  for (const [path] of copies) {
    const pm = require(join(mobile, path));
    for (const api of ["parse", "scan", "makeRe", "compileRe", "test", "isMatch", "matchBase"]) assert.equal(typeof pm[api], "function", api);
    const matcher = pm("**/*.{js,jsx,ts,tsx}", { dot: true }, true);
    assert.ok(matcher.state);
    assert.equal(matcher("src/DriverTripTracking.tsx"), true);
    assert.equal(matcher("src/image.png"), false);
    assert.equal(pm.isMatch("src/.hidden.ts", "**/*.ts", { dot: true }), true);
    assert.equal(pm.isMatch("src/.hidden.ts", "**/*.ts"), false);
    assert.equal(pm.isMatch("App.test.tsx", "!*.test.tsx"), false);
    assert.equal(pm.isMatch("ab", "+(*(a)|*(b))"), true);
    assert.equal(pm.isMatch("foo.js", "*(*.js)"), true);
    assert.equal(pm.isMatch("abc", "+(*)c"), true);
    assert.deepEqual([...pm.makeRe("src/*.tsx", { capture: true }).exec("src/Driver.tsx")].slice(1), ["Driver"]);
    assert.equal(pm.scan("src/**/*.tsx").base, "src");
    assert.equal(require(join(mobile, path, "posix.js"))("src/*.tsx")("src/Driver.tsx"), true);
  }
  const micromatch = require("micromatch");
  assert.deepEqual(micromatch(["src/App.tsx", "src/App.test.tsx", "src/icon.png"], ["**/*.tsx", "!**/*.test.tsx"]), ["src/App.tsx"]);
  const files = require("tinyglobby").globSync(["*.tsx"], { cwd: mobile });
  for (const name of ["App.tsx", "DriverTripTracking.tsx", "TechnicianWorkspace.tsx"]) {
    assert.ok(statSync(join(mobile, name)).isFile());
    assert.ok(files.includes(name), name);
  }
});
