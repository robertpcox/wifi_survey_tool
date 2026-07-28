import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Runner HTML exposes mobile entry, preflight, capture, and validation", () => {
  assert.match(html, /data-app="runner"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /runner-active\.css/);
  assert.match(html, /name="mapAccess" type="password" autocomplete="off"/);
  assert.match(html, /name="deviceType"/);
  assert.match(html, /name="band"/);
  assert.match(html, /data-action="preflight"/);
  assert.match(html, /data-action="go" disabled/);
  assert.match(html, /data-action="check-in"/);
  assert.match(html, /data-poll-indicator/);
  assert.match(html, /data-target-distance/);
  assert.match(html, /data-action="stop"/);
  assert.match(html, /data-action="download-result"/);
  assert.match(html, /data-result-file/);
  assert.doesNotMatch(html, /localStorage|sessionStorage|indexedDB/);
});
