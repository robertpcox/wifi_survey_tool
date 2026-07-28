import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Report Player HTML exposes one shell with optional map access", () => {
  assert.match(html, /data-app="report-player"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /public map and embedded overlays/);
  assert.doesNotMatch(html, /features\/report|features\/player/);
});
