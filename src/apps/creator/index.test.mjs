import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Creator HTML exposes its feature mount without duplicate access controls", () => {
  assert.match(html, /data-app="creator"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /data-definition-creator/);
  assert.match(html, /features\/definition-creator\/creator\.css/);
  assert.match(html, /features\/definition-creator\/components\.css/);
  assert.match(html, /features\/definition-creator\/dwell-schedule\.css/);
  assert.doesNotMatch(html, /data-(?:map-access|save-access|clear-access)/);
  assert.doesNotMatch(html, /data-field="(?:device|band)/i);
});
