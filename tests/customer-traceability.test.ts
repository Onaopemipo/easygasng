import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import { customerNavigation } from "../packages/business-rules/src/customer-navigation";
const directory = "docs/traceability";
test("RTM-01–07: every phase matrix has unique requirements, actual implementation and executed evidence, security negatives, gates and honest coverage", async () => {
  for (const file of (await readdir(directory)).filter((p) =>
    p.endsWith("-rtm.json"),
  )) {
    const matrix = JSON.parse(await readFile(`${directory}/${file}`, "utf8"));
    assert.ok(Array.isArray(matrix.requirements), `${file}: requirements must be an array`);
    assert.ok(Array.isArray(matrix.gates), `${file}: gates must be an array`);
    assert.equal(
      new Set(matrix.requirements.map((r: any) => r.id)).size,
      matrix.requirements.length,
    );
    assert.equal(
      new Set(matrix.gates.map((r: any) => r.id)).size,
      matrix.gates.length,
      `${file}: every gate needs a unique ID`,
    );
    for (const row of matrix.requirements) {
      for (const key of [
        "id",
        "requirement",
        "priority",
        "scope",
        "uiReference",
        "route",
        "dataSource",
        "securityControl",
        "status",
        "reason",
        "testResult",
        "outstandingWork",
      ])
        assert.ok(row[key], `${row.id}: ${key}`);
      assert.ok(matrix.gates.some((g: any) => g.id === row.acceptanceGate));
      for (const path of [
        ...row.implementationFiles,
        ...row.testFiles,
        ...row.evidence,
      ])
        await access(path);
      if (row.status === "VERIFIED_COMPLETE") {
        assert.ok(row.implementationFiles.length);
        assert.match(row.testResult, /^PASS/);
        const logs = (
          await Promise.all(
            row.evidence
              .filter((p: string) => p.endsWith(".txt"))
              .map((p: string) => readFile(p, "utf8")),
          )
        ).join("\n");
        assert.match(
          logs,
          /ℹ fail 0/,
          `${row.id}: no successful executed suite totals`,
        );
        assert.doesNotMatch(
          logs,
          /ℹ fail [1-9]/,
          `${row.id}: failed tests must be resolved or mapped as incomplete`,
        );
        for (const id of row.testIds)
          assert.ok(
            logs.split("\n").some((line) => line.startsWith("✔ " + id + ":")),
            `${row.id}: ${id} has no executed evidence`,
          );
      }
      if (row.priority === "P0") {
        assert.ok(
          row.negativeTests.length,
          `${row.id}: negative test required`,
        );
        const tests = (
          await Promise.all(
            row.testFiles.map((p: string) => readFile(p, "utf8")),
          )
        ).join("\n");
        for (const name of row.negativeTests) assert.ok(tests.includes(name));
      }
      if (row.status === "BLOCKED") assert.ok(row.reason.length > 10);
    }
  }
});
test("RTM customer phase retains all 65 IDs, all 15 routes and every CD acceptance gate", async () => {
  const matrix = JSON.parse(
    await readFile(`${directory}/easygas-customer-dashboard-rtm.json`, "utf8"),
  );
  assert.deepEqual(
    matrix.requirements.map((r: any) => r.id),
    Array.from(
      { length: 65 },
      (_, i) => `CD-REQ-${String(i + 1).padStart(3, "0")}`,
    ),
  );
  assert.deepEqual(
    matrix.gates.map((r: any) => r.id),
    Array.from(
      { length: 15 },
      (_, i) => `CD-${String(i + 1).padStart(2, "0")}`,
    ),
  );
  const routes = JSON.parse(
    await readFile(`${directory}/easygas-customer-routes.json`, "utf8"),
  );
  assert.equal(routes.length, 15);
  assert.equal(new Set(routes.map((r: any) => r.route)).size, 15);
  assert.deepEqual(
    [...routes.map((r: any) => r.route)].sort(),
    customerNavigation.map((i) => i.href).sort(),
  );
  for (const row of routes) {
    for (const key of [
      "component",
      "dataSource",
      "authentication",
      "ownership",
      "loading",
      "empty",
      "error",
      "status",
    ])
      assert.ok(row[key]);
    await access(row.page);
    await access(row.layout);
    await access(row.evidence);
  }
  assert.equal(matrix.releaseDecision, "NO-GO — Public Commercial Production");
});
