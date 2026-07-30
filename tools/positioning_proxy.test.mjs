// FEATURE:      Self-served app host + cloud positioning proxy (LAN)
// SURFACE:      node --test coverage for positioning_proxy.mjs
// WHY TOGETHER: Proxy forwarding, CORS, and static hosting are one server contract.
// STATE:        Ephemeral loopback servers and temp directories per test
// RULES:        Tests must not reach the real upstream; fetch doubles only.
// PROVENANCE:   On-site self-serve survey session, 2026-07-30

import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  PROXY_PREFIX,
  UPSTREAM_BASE,
  corsHeaders,
  createLocalServer,
  lanAddresses,
  upstreamUrl,
} from "./positioning_proxy.mjs";

test("upstreamUrl strips the proxy prefix and keeps the query", () => {
  assert.equal(
    upstreamUrl(`${PROXY_PREFIX}/position`, "?configId=1185&clientIp=10.0.0.9"),
    `${UPSTREAM_BASE}/position?configId=1185&clientIp=10.0.0.9`,
  );
  assert.equal(upstreamUrl(PROXY_PREFIX), `${UPSTREAM_BASE}/`);
});

test("corsHeaders allow any origin and the positioning headers", () => {
  const headers = corsHeaders();
  assert.equal(headers["Access-Control-Allow-Origin"], "*");
  assert.match(headers["Access-Control-Allow-Headers"], /X-Mazemap-App-Id/);
});

test("lanAddresses returns only external IPv4 strings", () => {
  for (const address of lanAddresses()) {
    assert.match(address, /^\d+\.\d+\.\d+\.\d+$/);
    assert.notEqual(address, "127.0.0.1");
  }
});

test("proxy forwards position requests with credentials headers", async () => {
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, headers: init.headers });
    return new Response(JSON.stringify({ latitude: -45.87 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const server = await createLocalServer({ root: tmpdir(), host: "127.0.0.1", port: 0, fetchImpl });
  try {
    const response = await fetch(
      `http://127.0.0.1:${server.port}${PROXY_PREFIX}/position?configId=1185&clientIp=10.0.0.9`,
      { headers: { "X-Mazemap-App-Id": "app-id", "X-Mazemap-App-Key": "app-key" } },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.deepEqual(await response.json(), { latitude: -45.87 });
    assert.equal(seen[0].url, `${UPSTREAM_BASE}/position?configId=1185&clientIp=10.0.0.9`);
    assert.equal(seen[0].headers["x-mazemap-app-id"], "app-id");
    assert.equal(seen[0].headers["x-mazemap-app-key"], "app-key");
  } finally {
    server.instance.close();
  }
});

test("proxy answers preflight, rejects writes, and reports upstream failure", async () => {
  const fetchImpl = async () => { throw new Error("no route to host"); };
  const server = await createLocalServer({ root: tmpdir(), host: "127.0.0.1", port: 0, fetchImpl });
  try {
    const base = `http://127.0.0.1:${server.port}${PROXY_PREFIX}/position`;
    const preflight = await fetch(base, { method: "OPTIONS" });
    assert.equal(preflight.status, 204);
    const write = await fetch(base, { method: "POST" });
    assert.equal(write.status, 405);
    const failed = await fetch(base);
    assert.equal(failed.status, 502);
    assert.match((await failed.json()).error, /no route to host/);
  } finally {
    server.instance.close();
  }
});

test("non-proxy paths serve the app root and refuse traversal", async () => {
  const root = await mkdtemp(join(tmpdir(), "proxy-static-"));
  await writeFile(join(root, "index.html"), "<title>Survey</title>");
  const server = await createLocalServer({ root, host: "127.0.0.1", port: 0 });
  try {
    const page = await fetch(`http://127.0.0.1:${server.port}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Survey/);
    const missing = await fetch(`http://127.0.0.1:${server.port}/nope.html`);
    assert.equal(missing.status, 404);
  } finally {
    server.instance.close();
  }
});
