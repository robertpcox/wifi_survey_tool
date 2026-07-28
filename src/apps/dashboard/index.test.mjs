import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Dashboard HTML exposes a feature-free module shell", () => {
  assert.match(html, /data-app="dashboard"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /customer-aware dashboard shell/);
  assert.doesNotMatch(html, /src\/features|features\//);
});
