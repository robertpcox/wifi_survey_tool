import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Runner HTML exposes its module shell and memory-only map access", () => {
  assert.match(html, /data-app="runner"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /data-map-access type="password"/);
  assert.doesNotMatch(html, /features\/runner/);
});
