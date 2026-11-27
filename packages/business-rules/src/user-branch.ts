/** Canonical initial user branch. Explicit backend assignments always take precedence. */
export const DEFAULT_USER_BRANCH_ID = "lagos";
export function initialUserBranch(
  branches: Array<{ id?: string; value?: string }>,
  assigned?: string | null,
) {
  const ids = branches.map((b) => b.id ?? b.value);
  if (assigned && ids.includes(assigned)) return assigned;
  if (ids.includes(DEFAULT_USER_BRANCH_ID)) return DEFAULT_USER_BRANCH_ID;
  return ids.length === 1 ? (ids[0] ?? "") : "";
}
