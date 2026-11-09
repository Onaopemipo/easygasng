import { readFile, writeFile } from "node:fs/promises";
const source = "docs/traceability/easygas-customer-dashboard-rtm.json";
const r = JSON.parse(await readFile(source, "utf8"));
const link = (p: string) => `[${p}](../../${p})`;
let md =
  "# Customer dashboard requirements traceability\n\nSource: " +
  link(source) +
  ". All 65 approved requirements remain represented. Status is based on actual evidence; implementation is distinct from verification. Existing production decision: **NO-GO**.\n\n";
for (const row of r.requirements) {
  md += `## ${row.id} — ${row.requirement}\n\n| Field | Evidence |\n|---|---|\n`;
  for (const key of [
    "priority",
    "scope",
    "uiReference",
    "route",
    "implementationFiles",
    "dataSource",
    "securityControl",
    "testIds",
    "testFiles",
    "testResult",
    "acceptanceGate",
    "status",
    "reason",
    "evidence",
    "negativeTests",
    "outstandingWork",
  ]) {
    const value = row[key];
    md += `| ${key} | ${Array.isArray(value) ? value.map((v: string) => (v.includes("/") ? link(v) : v)).join("; ") : String(value).replaceAll("|", "\\|")} |\n`;
  }
  md += "\n";
}
md +=
  "## Change history\n\n" +
  r.changes.map((c: any) => `- ${c.date}: ${c.change}`).join("\n") +
  "\n";
await writeFile("docs/traceability/easygas-customer-dashboard-rtm.md", md);
const applicable = r.requirements.filter(
    (x: any) => x.status !== "NOT_APPLICABLE",
  ),
  implemented = applicable.filter((x: any) => x.implementationFiles.length > 0),
  verified = applicable.filter((x: any) => x.status === "VERIFIED_COMPLETE"),
  critical = applicable.filter((x: any) => x.priority === "P0"),
  criticalVerified = critical.filter(
    (x: any) => x.status === "VERIFIED_COMPLETE",
  ),
  gates = r.gates.filter((x: any) => x.status !== "NOT_APPLICABLE"),
  passed = gates.filter((x: any) => x.status === "PASS");
const pct = (n: number, d: number) => ((100 * n) / d).toFixed(2) + "%";
const routes = JSON.parse(
  await readFile("docs/traceability/easygas-customer-routes.json", "utf8"),
);
let coverage = `# Customer dashboard coverage\n\nLocal evidence dated ${r.date}. Public commercial release: **NO-GO**. This phase is **not fully accepted** while required gates remain open.\n\n| Metric | Result |\n|---|---|\n| Applicable requirements | ${applicable.length} |\n| With implementation evidence (including partial) | ${implemented.length}/${applicable.length} = ${pct(implemented.length, applicable.length)} |\n| Verified complete | ${verified.length}/${applicable.length} = ${pct(verified.length, applicable.length)} |\n| Critical verified | ${criticalVerified.length}/${critical.length} = ${pct(criticalVerified.length, critical.length)} |\n| Partial | ${applicable.filter((x: any) => x.status === "PARTIAL").length} |\n| Implemented, unverified | ${applicable.filter((x: any) => x.status === "IMPLEMENTED_UNVERIFIED").length} |\n| Blocked | ${applicable.filter((x: any) => x.status === "BLOCKED").length} |\n| Defective | ${applicable.filter((x: any) => x.status === "DEFECTIVE").length} |\n| Routes verified at desktop + 390px | ${routes.filter((x: any) => x.status === "VERIFIED_COMPLETE").length}/15 |\n| Acceptance gates | ${passed.length}/${gates.length} = ${pct(passed.length, gates.length)} |\n\nPartial and unverified requirements remain in denominators. Implementation coverage indicates mapped code, not acceptance. Critical verification refers to local identity, data isolation, financial read-model and continuity controls, not independent production security certification.\n\n| Gate | Result | Reason |\n|---|---|---|\n`;
coverage += r.gates
  .map((g: any) => `| ${g.id} | ${g.status} | ${g.reason} |`)
  .join("\n");
coverage +=
  "\n\n## Outstanding requirements\n\n" +
  applicable
    .filter((x: any) => x.status !== "VERIFIED_COMPLETE")
    .map((x: any) => `- ${x.id} (${x.status}): ${x.outstandingWork}`)
    .join("\n") +
  "\n";
await writeFile(
  "docs/reports/easygas-customer-dashboard-coverage.md",
  coverage,
);
