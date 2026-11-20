import { nativeRequest } from "./native-workspaces";
/** Bounded, quoted CSV parser for a preview. This function never imports or changes records. */
export function nativeCataloguePreview(
  csv: string,
  current: readonly { id: string }[],
) {
  if (csv.length > 200000)
    throw Error("Preview at most 200,000 characters at a time.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(cell);
      cell = "";
      if (c !== ",") {
        if (c === "\r" && csv[i + 1] === "\n") i++;
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        if (rows.length > 501) throw Error("Preview at most 500 product rows.");
      }
    } else cell += c;
  }
  if (quoted) throw Error("Close the quoted CSV cell before previewing.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (rows.length > 501) throw Error("Preview at most 500 product rows.");
  if (rows.length < 2)
    throw Error("Paste a header and at least one product row.");
  const header = rows.shift()!.map((v) => v.replace(/^\uFEFF/, "").trim()),
    needed = [
      "id",
      "name",
      "description",
      "category",
      "sizeKg",
      "asset",
      "safety",
    ];
  if (needed.some((k) => !header.includes(k)))
    throw Error("Use these CSV headers: " + needed.join(", "));
  if (new Set(header).size !== header.length)
    throw Error("Each CSV column must occur once.");
  if (header.some((k) => !needed.includes(k)))
    throw Error(
      "Only product metadata is supported; remove stock, price, customer and payment columns.",
    );
  const seen = new Set<string>();
  return rows.map((cells, index) => {
    const input = Object.fromEntries(
        header.map((k, i) => [k, cells[i]?.trim() || ""]),
      ),
      errors: string[] = [];
    if (cells.length !== header.length)
      errors.push("Column count does not match the header.");
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(input.id))
      errors.push("Use a valid product identifier.");
    if (seen.has(input.id))
      errors.push("Product appears twice in this preview.");
    seen.add(input.id);
    let value: any;
    try {
      value = nativeRequest("product.import", input);
    } catch (e: any) {
      errors.push(e.message);
    }
    return {
      row: index + 2,
      id: input.id,
      name: input.name,
      existing: current.some((p) => p.id === input.id),
      value,
      errors,
    };
  });
}
