import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProductImport,
  productImportTemplate,
  productImportHeaders,
} from "../packages/business-rules/src/product-import";
const product = {
  id: "new-hose",
  name: "Gas Hose",
  description: "A suitable hose for gas connections.",
  category: "Accessories",
  sizeKg: null,
  asset: "hose",
  safety: "Have a qualified professional install this hose.",
};
const parse = (text: string, existing: string[] = []) =>
  parseProductImport(text, ["Accessories", "Gas Refills"], existing);
test("downloaded template has Excel BOM and blocks unchanged example", () => {
  const text = productImportTemplate();
  assert.ok(text.startsWith("\uFEFF"));
  assert.throws(() => parse(text), /replace the example/);
  assert.equal(
    parse(text.replace("replace-with-unique-product-id", "custom-hose"))[0]
      .sizeKg,
    null,
  );
});
test("CSV supports reordered headers, escaped quotes, commas, multiline fields and CRLF", () => {
  const headers = [...productImportHeaders].reverse();
  const row = {
    ...product,
    description: 'Hose, with a "secure" fitting.\nInstall carefully.',
  };
  const text =
    headers.join(",") +
    "\r\n" +
    headers
      .map(
        (k) =>
          '"' +
          String(row[k as keyof typeof row] ?? "").replaceAll('"', '""') +
          '"',
      )
      .join(",") +
    "\r\n\r\n";
  assert.deepEqual(parse(text), [row]);
});
test("CSV rejects malformed quotes, columns and headers", () => {
  assert.throws(() => parse("id,name\na,b"), /headers/);
  assert.throws(
    () => parse(productImportHeaders.join(",") + "\na,b"),
    /columns/,
  );
  assert.throws(
    () => parse(productImportHeaders.join(",") + '\n"abc'),
    /unclosed/,
  );
  assert.throws(
    () => parse(productImportHeaders.join(",") + '\n"abc"bad'),
    /quoting/,
  );
});
test("JSON compatibility and draft-only validation protect existing catalogue", () => {
  assert.deepEqual(parse(JSON.stringify([product])), [product]);
  for (const rows of [
    [product, product],
    [{ ...product, price_kobo: 100 }],
    [{ ...product, sizeKg: "6" }],
    [{ ...product, category: "Unknown" }],
    [{ ...product, category: "Gas Refills" }],
    [{ ...product, sizeKg: -1 }],
  ])
    assert.throws(() => parse(JSON.stringify(rows)));
  assert.throws(
    () => parse(JSON.stringify([product]), [product.id]),
    /already exists/,
  );
  assert.throws(() => parse("[]"), /1–25/);
  assert.throws(
    () =>
      parse(
        JSON.stringify(
          Array.from({ length: 26 }, (_, i) => ({
            ...product,
            id: `hose-${i}`,
          })),
        ),
      ),
    /1–25/,
  );
  assert.throws(() => parse("x".repeat(100001)), /100 KB/);
});
