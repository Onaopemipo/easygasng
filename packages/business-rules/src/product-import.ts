export const productImportHeaders = [
  "id",
  "name",
  "description",
  "category",
  "sizeKg",
  "asset",
  "safety",
];
const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function productImportTemplate(category = "Accessories") {
  return (
    "\uFEFF" +
    [
      productImportHeaders,
      [
        "replace-with-unique-product-id",
        "Example Gas Hose",
        "Replace this example with your product description.",
        category,
        "",
        "hose",
        "Replace with the verified safety instructions for this product.",
      ],
    ]
      .map((row) => row.map(quote).join(","))
      .join("\r\n") +
    "\r\n"
  );
}
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const pushCell = () => {
    row.push(cell);
    cell = "";
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
        closed = true;
      } else cell += ch;
    } else if (ch === ",") pushCell();
    else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      pushCell();
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else if (ch === '"' && !cell && !closed) quoted = true;
    else if (closed || ch === '"')
      throw new Error(
        "Invalid CSV quoting. Save the file as CSV with comma separators.",
      );
    else cell += ch;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  pushCell();
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
export function parseProductImport(
  text: string,
  categories: string[],
  existingIds: string[],
) {
  text = text.replace(/^\uFEFF/, "").trim();
  if (new TextEncoder().encode(text).length > 100000)
    throw new Error("File must be under 100 KB.");
  let rows: any[];
  if (text.startsWith("[")) rows = JSON.parse(text);
  else {
    const [header, ...records] = csvRows(text);
    if (
      !header ||
      header.length !== productImportHeaders.length ||
      new Set(header.map((h) => h.trim())).size !==
        productImportHeaders.length ||
      productImportHeaders.some((h) => !header.map((v) => v.trim()).includes(h))
    )
      throw new Error(
        "CSV headers must be: " + productImportHeaders.join(", "),
      );
    rows = records.map((record, i) => {
      if (record.length !== header.length)
        throw new Error(`Row ${i + 2}: expected ${header.length} columns.`);
      return Object.fromEntries(
        header.map((h, j) => [
          h.trim(),
          h.trim() === "sizeKg"
            ? record[j].trim() === ""
              ? null
              : Number(record[j])
            : record[j].trim(),
        ]),
      );
    });
  }
  if (!Array.isArray(rows) || !rows.length || rows.length > 25)
    throw new Error("Provide 1–25 products per import.");
  const ids = new Set(existingIds);
  rows.forEach((r, i) => {
    const fail = (message: string) => {
      throw new Error(`Product ${i + 1}: ${message}`);
    };
    if (
      !r ||
      typeof r !== "object" ||
      Object.keys(r).some((k) => !productImportHeaders.includes(k))
    )
      fail(
        "only template fields are allowed; prices, stock and publication cannot be imported.",
      );
    if (typeof r.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,79}$/.test(r.id))
      fail("id must contain 2–80 lowercase letters, numbers or hyphens.");
    if (r.id === "replace-with-unique-product-id")
      fail("replace the example row with your own product details.");
    for (const [key, min, max] of [
      ["name", 3, 100],
      ["description", 10, 2000],
      ["safety", 10, 2000],
    ] as const)
      if (
        typeof r[key] !== "string" ||
        r[key].trim().length < min ||
        r[key].trim().length > max
      )
        fail(`${key} must contain ${min}–${max} characters.`);
    if (!categories.includes(r.category))
      fail("choose an active category: " + categories.join(", "));
    if (!["cylinder", "burner", "hose", "regulator", "kit"].includes(r.asset))
      fail("asset must be cylinder, burner, hose, regulator or kit.");
    if (
      r.sizeKg !== null &&
      (typeof r.sizeKg !== "number" ||
        !Number.isFinite(r.sizeKg) ||
        r.sizeKg <= 0 ||
        r.sizeKg > 100)
    )
      fail(
        "sizeKg must be blank (CSV), null (JSON), or a number greater than 0 and at most 100.",
      );
    if (
      /refill|cooking gas/i.test(r.category) &&
      (r.sizeKg === null || r.asset !== "cylinder")
    )
      fail("refills require a cylinder size and cylinder illustration.");
    if (ids.has(r.id))
      fail(
        "identifier already exists or is duplicated in this file. Use Edit for existing products.",
      );
    ids.add(r.id);
  });
  return rows;
}
