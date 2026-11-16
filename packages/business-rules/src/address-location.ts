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
export function selectAddressLocation(
  address: string,
  locations: { id: string; name: string }[],
  chosenId = "",
) {
  const chosen = locations.find((location) => location.id === chosenId);
  const result = resolveAddressLocation(address, locations);
  if (chosen) {
    if (result.location && result.location.id !== chosen.id)
      return {
        location: chosen,
        message: `Your address mentions ${result.location.name}. You selected ${chosen.name}. Check which area is correct.`,
      };
    if (result.status === "ambiguous")
      return {
        location: chosen,
        message: `Your address mentions more than one area. Check that ${chosen.name} is correct.`,
      };
    return { location: chosen, message: "" };
  }
  return {
    location: result.location,
    message: result.location
      ? `Suggested location: ${result.location.name}. You can change it if needed.`
      : result.status === "ambiguous"
        ? "Your address mentions more than one area. Choose the correct location."
        : "Add your area after a comma or choose it from the list.",
  };
}
