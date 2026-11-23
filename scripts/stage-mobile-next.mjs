import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
const root = process.cwd(),
  stage = await fs.mkdtemp(
    path.join(os.tmpdir(), "easygas-mobile-next-source-"),
  ),
  prototype = "prototypes/easygas-mobile-next";
async function copy(rel) {
  const p = path.join(stage, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.copyFile(path.join(root, rel), p);
}
const manifest = JSON.parse(
  await fs.readFile(path.join(prototype, "source-manifest.json"), "utf8"),
);
for (const s of manifest.sources) await copy(s.path);
for (const f of [
  "build.mjs",
  "package.json",
  "index.html",
  "style.css",
  "source-manifest.json",
])
  await copy(prototype + "/" + f);
for (const f of [
  "easygas-logo-hd.png",
  "cylinder-illustration.png",
  "delivery-illustration.png",
])
  await copy("apps/web/public/assets/" + f);
await fs.cp(path.join(root, prototype, "dist"), path.join(stage, "dist"), {
  recursive: true,
});
await fs.mkdir(path.join(stage, ".openai"), { recursive: true });
await fs.copyFile(
  path.join(root, prototype, ".openai/hosting.json"),
  path.join(stage, ".openai/hosting.json"),
);
await fs.writeFile(
  path.join(stage, "build.mjs"),
  "import fs from 'node:fs/promises';await import('./prototypes/easygas-mobile-next/build.mjs');await fs.cp('prototypes/easygas-mobile-next/dist','dist',{recursive:true});\n",
);
const pkg = {
  name: "easygas-mobile-next-private",
  private: true,
  type: "module",
  scripts: { build: "node build.mjs" },
  dependencies: {},
};
for (const n of ["react", "react-dom", "lucide-react", "esbuild"])
  pkg.dependencies[n] = JSON.parse(
    await fs.readFile("node_modules/" + n + "/package.json", "utf8"),
  ).version;
await fs.writeFile(
  path.join(stage, "package.json"),
  JSON.stringify(pkg, null, 2) + "\n",
);
await fs.writeFile(
  path.join(stage, ".gitignore"),
  "node_modules/\n.sites-runtime/\n",
);
await fs.writeFile(
  path.join(stage, "README.md"),
  "# EasyGas Mobile Next\nPrivate mobile app design prototype. Synthetic browser-local workflows; no live API, provider, device or production effect. Original 36 feature families and 300 items retained.\n",
);
await fs.writeFile(
  "docs/mobile-ux-20261123/evidence/staging.json",
  JSON.stringify(
    {
      checkout_path: stage,
      archive: path.join(os.tmpdir(), "easygas-mobile-next-deploy.tar.gz"),
    },
    null,
    2,
  ) + "\n",
);
console.log(stage);
