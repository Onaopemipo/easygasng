import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

function luminance(hex: string) {
  const channels = hex.match(/\w{2}/g)!.map((channel) => {
    const srgb = parseInt(channel, 16) / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string) {
  const pair = [luminance(a), luminance(b)];
  return (Math.max(...pair) + 0.05) / (Math.min(...pair) + 0.05);
}

test("FC-01: native field values and placeholders use the same accessible theme surface", async () => {
  const typography = await readFile("apps/mobile/typography.tsx", "utf8");
  const input = typography.split("function TextInput")[1];
  assert.match(input, /\{\.\.\.props\}\s+placeholderTextColor=\{colors\.muted\}/);
  assert.match(input, /style=\{\[\s*style,\s*\{[^}]*backgroundColor: colors\.input,\s*color: colors\.text,/);
  assert.doesNotMatch(input, /readable\(/);

  const theme = await readFile("apps/mobile/theme.tsx", "utf8");
  for (const mode of ["light", "dark"]) {
    const palette = theme.match(new RegExp(`^  ${mode}: \\{([\\s\\S]+?)^  \\},`, "m"))?.[1];
    assert.ok(palette, mode);
    const colors = Object.fromEntries(
      [...palette.matchAll(/(\w+): "(#[0-9a-f]{6})"/g)].map(([, name, value]) => [name, value]),
    );
    for (const foreground of ["text", "muted"]) {
      assert.ok(contrast(colors[foreground], colors.input) >= 4.5, `${mode} ${foreground}`);
    }
  }
});

test("FC-02: mobile screens keep the native input theme and password control", async () => {
  for (const entry of await readdir("apps/mobile", { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".tsx") || entry.name === "typography.tsx") continue;
    const source = await readFile(`apps/mobile/${entry.name}`, "utf8");
    for (const [, imports] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']react-native["']/g)) {
      assert.doesNotMatch(imports, /\bTextInput\b/, entry.name);
    }
  }
});

test("FC-03: web placeholders have a theme colour and full opacity", async () => {
  const theme = await readFile("apps/web/app/theme.css", "utf8");
  assert.match(theme, /:is\(input, textarea\)::placeholder\s*\{\s*color: var\(--input-placeholder\);\s*opacity: 1;/);
  const pairs = [...theme.matchAll(/--input: (#[0-9a-f]{6});\s*--input-placeholder: (#[0-9a-f]{6});/g)];
  assert.equal(pairs.length, 2);
  for (const [, background, placeholder] of pairs) {
    assert.ok(contrast(placeholder, background) >= 4.5);
  }
});
