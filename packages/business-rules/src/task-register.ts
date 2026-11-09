export type RegisteredTask = {
  id: string;
  status: "TODO" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  dependsOn: string[];
  blockerIds: string[];
};
export function runnableTasks(tasks: RegisteredTask[], openBlockers: string[]) {
  const map = new Map(tasks.map((t) => [t.id, t]));
  if (map.size !== tasks.length) throw new Error("Duplicate task identity");
  const visited = new Set<string>(),
    visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("Task dependency cycle");
    if (visited.has(id)) return;
    const t = map.get(id);
    if (!t) throw new Error("Unknown task dependency: " + id);
    visiting.add(id);
    t.dependsOn.forEach(visit);
    visiting.delete(id);
    visited.add(id);
  }
  tasks.forEach((t) => visit(t.id));
  return tasks
    .filter(
      (t) =>
        t.status === "TODO" &&
        t.dependsOn.every((id) => map.get(id)?.status === "DONE") &&
        !t.blockerIds.some((id) => openBlockers.includes(id)),
    )
    .map((t) => t.id);
}
export function taskReadiness(tasks: RegisteredTask[], openBlockers: string[]) {
  const ready = new Set(runnableTasks(tasks, openBlockers));
  const map = new Map(tasks.map((t) => [t.id, t]));
  function blockers(id: string): string[] {
    const t = map.get(id)!;
    return [
      ...new Set([
        ...t.blockerIds.filter((b) => openBlockers.includes(b)),
        ...t.dependsOn
          .filter((d) => map.get(d)?.status !== "DONE")
          .flatMap(blockers),
      ]),
    ];
  }
  return tasks.map((t) => ({
    id: t.id,
    status: t.status,
    ready: ready.has(t.id),
    unmetDependencies: t.dependsOn.filter((d) => map.get(d)?.status !== "DONE"),
    activeBlockers: blockers(t.id),
    needsReassessment:
      t.status === "BLOCKED" &&
      t.dependsOn.every((d) => map.get(d)?.status === "DONE") &&
      !blockers(t.id).length,
  }));
}
