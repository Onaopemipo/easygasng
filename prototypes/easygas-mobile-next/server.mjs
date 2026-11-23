import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");
http
  .createServer(async (req, res) => {
    try {
      let name = decodeURIComponent(new URL(req.url, "http://local").pathname);
      const p = path.resolve(dir, "." + name);
      if (!p.startsWith(dir + path.sep) && p !== dir) {
        res.writeHead(403);
        res.end();
        return;
      }
      const target = name === "/" ? path.join(dir, "index.html") : p;
      const b = await fs.readFile(target);
      res.setHeader(
        "Content-Type",
        {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "text/javascript",
          ".png": "image/png",
        }[path.extname(target)] || "application/octet-stream",
      );
      res.end(b);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  })
  .listen(3031, "127.0.0.1", () =>
    console.log("Local: http://127.0.0.1:3031/"),
  );
