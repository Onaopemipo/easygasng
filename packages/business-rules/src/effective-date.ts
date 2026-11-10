/** A requested business date begins at midnight in Lagos, independent of device timezone. */
export function effectiveDateInLagos(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Choose a valid effective date.");
  const instant = new Date(`${date}T00:00:00+01:00`);
  if (!Number.isFinite(instant.getTime()) || new Date(instant.getTime() + 3600000).toISOString().slice(0, 10) !== date)
    throw new Error("Choose a valid effective date.");
  return `${date}T00:00:00+01:00`;
}
