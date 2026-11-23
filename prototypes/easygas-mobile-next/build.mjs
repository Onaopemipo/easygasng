import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const dir = path.dirname(fileURLToPath(import.meta.url)),
  root = path.resolve(dir, "../..");
await fs.mkdir(path.join(dir, "dist/assets"), { recursive: true });
const r = await build({
  entryPoints: [path.join(dir, "main.tsx")],
  outfile: path.join(dir, "dist/app.js"),
  bundle: true,
  minify: true,
  metafile: true,
  format: "iife",
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  loader: { ".png": "file", ".webp": "file" },
});
for (const f of ["index.html", "style.css"])
  await fs.copyFile(path.join(dir, f), path.join(dir, "dist", f));
for (const f of [
  "easygas-logo-hd.png",
  "cylinder-illustration.png",
  "delivery-illustration.png",
])
  await fs.copyFile(
    path.join(root, "apps/web/public/assets", f),
    path.join(dir, "dist/assets", f),
  );
const sources = [];
for (const p of Object.keys(r.metafile.inputs).filter(
  (p) => !p.includes("node_modules"),
)) {
  sources.push({
    path: path.relative(root, path.resolve(p)),
    sha256: createHash("sha256")
      .update(await fs.readFile(p))
      .digest("hex"),
  });
}
await fs.writeFile(
  path.join(dir, "source-manifest.json"),
  JSON.stringify(
    {
      scope:
        "New mobile app design, isolated synthetic workflow domain; not a native binary",
      sources,
    },
    null,
    2,
  ) + "\n",
);
console.log("Built mobile redesign:", sources.length, "reviewed source inputs");
