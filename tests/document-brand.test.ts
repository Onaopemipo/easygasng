import test from "node:test";
import assert from "node:assert/strict";
import { brandedMailHtml, documentBrand } from "../apps/web/lib/document-brand";
import { readFile } from "node:fs/promises";

test("BRAND-01: all SMTP email uses escaped branded HTML, embedded logo and original plain text", async () => {
  const html = brandedMailHtml('<script>bad</script>', 'Hello <img onerror="bad">\nhttps://example.test/reset?a=1&b=2\njavascript:alert(1)');
  assert.ok(html.includes(`cid:${documentBrand.logoCid}`));
  assert.ok(html.includes('#07592e') && html.includes('#91c900') && html.includes('#ff7900'));
  assert.ok(!html.includes('<script>') && !html.includes('<img onerror'));
  assert.match(html, /href="https:\/\/example.test\/reset\?a=1&amp;b=2"/);
  assert.ok(!html.includes('href="javascript:'));
  const source = await readFile('apps/web/lib/transactional-mail.ts', 'utf8');
  assert.match(source, /text: m.body/);
  assert.match(source, /html: brandedMailHtml/);
  assert.match(source, /content: await readFile/);
});
