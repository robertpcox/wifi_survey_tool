// FEATURE:      Self-served app host + cloud positioning proxy (LAN)
// SURFACE:      createLocalServer(options), upstreamUrl(pathname, search), corsHeaders(), lanAddresses()
// WHY TOGETHER: Hosting the built app and the positioning proxy on one origin keeps the
//               default /mm-positioning-proxy base working without the demo host.
// STATE:        One HTTP server per createLocalServer call; no shared module state
// RULES:        GET/OPTIONS only on the proxy; prefix is stripped before forwarding upstream.
// PROVENANCE:   On-site self-serve survey session, 2026-07-30
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { contentTypeFor } from "./static_server.mjs";

export const PROXY_PREFIX = "/mm-positioning-proxy";
export const UPSTREAM_BASE = "https://cloudpositioning.mazemap.com";
const FORWARDED_HEADERS = ["x-mazemap-app-id", "x-mazemap-app-key", "accept"];

export function upstreamUrl(pathname, search = "") {
  const rest = pathname.slice(PROXY_PREFIX.length) || "/";
  return `${UPSTREAM_BASE}${rest}${search}`;
}

export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "X-Mazemap-App-Id, X-Mazemap-App-Key, Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function lanAddresses() {
  return Object.values(networkInterfaces()).flat()
    .filter(entry => entry && entry.family === "IPv4" && !entry.internal)
    .map(entry => entry.address);
}

export async function createLocalServer(options = {}) {
  const root = resolve(options.root ?? "dist");
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const instance = createServer(async (request, response) => {
    const url = new URL(request.url, "http://local");
    const pathname = decodeURIComponent(url.pathname);
    if (pathname === PROXY_PREFIX || pathname.startsWith(`${PROXY_PREFIX}/`)) {
      await proxyRequest(request, response, url, fetchImpl);
      return;
    }
    await serveStatic(root, pathname, response);
  });
  await new Promise((resolveListen, rejectListen) => {
    instance.once("error", rejectListen);
    instance.listen(options.port ?? 8788, options.host ?? "0.0.0.0", resolveListen);
  });
  return { instance, port: instance.address().port };
}

async function proxyRequest(request, response, url, fetchImpl) {
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders()).end();
    return;
  }
  if (request.method !== "GET") {
    response.writeHead(405, corsHeaders()).end();
    return;
  }
  const headers = {};
  for (const name of FORWARDED_HEADERS) {
    if (request.headers[name]) headers[name] = request.headers[name];
  }
  try {
    const upstream = await fetchImpl(upstreamUrl(url.pathname, url.search), { headers });
    const body = await upstream.text();
    response.writeHead(upstream.status, {
      ...corsHeaders(),
      "Content-Type": upstream.headers.get("content-type")
        ?? "application/json; charset=utf-8",
    }).end(body);
  } catch (error) {
    response.writeHead(502, {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
    }).end(JSON.stringify({
      error: `Upstream positioning request failed: ${error?.message || error}`,
    }));
  }
}

async function serveStatic(root, pathname, response) {
  const relativePath = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const path = resolve(root, `.${relativePath}`);
  if (!path.startsWith(root)) {
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
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? process.argv[2] ?? 8788);
  const root = process.argv[3] ?? "dist";
  const server = await createLocalServer({ port, root });
  console.log(`Serving ${resolve(root)} with the positioning proxy on:`);
  for (const address of ["127.0.0.1", ...lanAddresses()]) {
    console.log(`  http://${address}:${server.port}/`);
  }
  console.log(`Proxy endpoint: ${PROXY_PREFIX}/position -> ${UPSTREAM_BASE}/position`);
}
