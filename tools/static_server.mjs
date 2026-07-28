import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

export function contentTypeFor(path) {
  return {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
  }[extname(path)] || "application/octet-stream";
}

export async function startStaticServer(root) {
  const instance = createServer(async (request, response) => {
    const requestPath = decodeURIComponent(new URL(request.url, "http://local").pathname);
    if (requestPath === "/favicon.ico") {
      response.writeHead(204).end();
      return;
    }
    const relativePath = requestPath.endsWith("/") ? `${requestPath}index.html` : requestPath;
    const path = resolve(root, `.${relativePath}`);
    if (!path.startsWith(resolve(root))) {
      response.writeHead(403).end();
      return;
    }
    try {
      const metadata = await stat(path);
      if (!metadata.isFile()) throw new Error("not a file");
      response.writeHead(200, { "Content-Type": contentTypeFor(path) });
      createReadStream(path).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });
  await new Promise(resolveListen => instance.listen(0, "127.0.0.1", resolveListen));
  const { port } = instance.address();
  return { instance, origin: `http://127.0.0.1:${port}` };
}
