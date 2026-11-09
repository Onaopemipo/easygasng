/** Address assistance only: operational coverage remains server-validated. */
export function resolveAddressLocation(
  address: string,
  locations: { id: string; name: string }[],
) {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.]/g, "")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  // Match complete locality segments, never an area embedded in a street name.
  const parts = address
    .split(/[,;\n]/)
    .map(normalize)
    .filter(Boolean);
  const full = normalize(address);
  const matches = locations.filter((l) =>
    parts.some((p) => {
      const name = normalize(l.name);
      return (
        p === name ||
        p === `${name} lagos` ||
        p === `${name} lagos nigeria` ||
        full.endsWith(` ${name} lagos`) ||
        full.endsWith(` ${name} lagos nigeria`)
      );
    }),
  );
  const candidate = matches[0];
  const index = candidate
    ? parts.findIndex(
        (p) =>
          p === normalize(candidate.name) ||
          p.startsWith(normalize(candidate.name) + " lagos"),
      )
    : -1;
  // An unrelated locality after the candidate is a conflicting address, not coverage evidence.
  const conflictingTail =
    index >= 0 &&
    parts
      .slice(index + 1)
      .some(
        (p) =>
          !/^(lagos(?: state)?|nigeria|ng|\d{6}|lagos(?: state)? nigeria)$/.test(
            p,
          ),
      );
  return matches.length === 1 && !conflictingTail
    ? { status: "matched" as const, location: matches[0] }
    : {
        status:
          matches.length > 1 ? ("ambiguous" as const) : ("unmatched" as const),
        location: null,
      };
}
export function addressLocationMessage(status: string, name?: string) {
  return status === "matched"
    ? `Delivery location selected: ${name}. Please confirm it below.`
    : status === "ambiguous"
      ? "More than one delivery area appears in this address. Please choose the correct location below."
      : "Enter your house/flat number, street, estate and area, separated by commas. If the area cannot be identified, choose it below.";
}
