import { readFile, writeFile, access } from "node:fs/promises";
import { taskReadiness } from "../packages/business-rules/src/task-register";
const source = "docs/reports/easygas-homepage-task-register.json";
const register = JSON.parse(await readFile(source, "utf8"));
const blockers = register.blockers
  .filter((b: any) => b.status !== "RESOLVED")
  .map((b: any) => b.id);
const allBlockers = new Set(register.blockers.map((b: any) => b.id));
for (const t of register.tasks) {
  for (const b of t.blockerIds)
    if (!allBlockers.has(b)) throw new Error(`${t.id}: unknown blocker ${b}`);
  if (t.status === "DONE" && !t.evidence.length)
    throw new Error(`${t.id}: completed task needs evidence`);
  for (const path of t.evidence) await access(path);
}
const readiness = taskReadiness(register.tasks, blockers);
if (process.argv.includes("--write")) {
  const text =
    `# Dependency-aware homepage task register\n\nUpdated ${register.updated}. Production: **${register.productionDecision}**. Source: [JSON](easygas-homepage-task-register.json). Regenerate with \`npm run tasks:homepage -- --write\`. A task is runnable only when every dependency is DONE and it has no open blocker. Closing a blocker does not certify the affected task; BLOCKED tasks require reassessment before returning to TODO.\n\n| Task | Status | Ready | Dependencies still open | Active blockers (including inherited) | Next step |\n|---|---|---|---|---|---|\n` +
    readiness
      .map((r: any) => {
        const t = register.tasks.find((t: any) => t.id === r.id);
        return `| ${r.id} | ${r.status} | ${r.ready ? "Yes" : "No"} | ${r.unmetDependencies.join(", ") || "—"} | ${r.activeBlockers.join(", ") || "—"} | ${t.nextStep} |`;
      })
      .join("\n") +
    "\n\nOpen blockers are documented in [homepage blockers](easygas-homepage-blocker-register.md) and [dark-mode blockers](easygas-dark-mode-blockers.md). Independent local work continues while external production dependencies remain open.\n";
  await writeFile("docs/reports/easygas-homepage-task-register.md", text);
}
console.log(
  JSON.stringify(
    {
      ready: readiness.filter((t) => t.ready).map((t) => t.id),
      tasks: readiness,
    },
    null,
    2,
  ),
);
