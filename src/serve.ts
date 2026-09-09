import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

export function requestPath(url: string): string | null {
  try {
    const raw = decodeURIComponent((url.split("?")[0] ?? "/") || "/");
    return raw === "" ? "/" : raw;
  } catch {
    return null;
  }
}

export function serveStatic(rootDir: string, host: string, port: number): void {
  const root = resolve(rootDir);
  const server = createServer((req, res) => {
    const raw = requestPath(req.url ?? "/");
    if (raw === null) {
      res.writeHead(400).end("Bad request");
      return;
    }
    const rel = raw === "/" ? "index.html" : raw.replace(/^\/+/, "");
    const file = normalize(join(root, rel));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404).end("Not found");
      return;
    }
    const type = MIME[extname(file)] ?? "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });
    createReadStream(file).pipe(res);
  });
  server.listen(port, host, () => {
    console.log(`静态服务：http://${host}:${port}/`);
    if (host === "0.0.0.0") {
      console.log(`本机可开：http://127.0.0.1:${port}/`);
    }
  });
}
