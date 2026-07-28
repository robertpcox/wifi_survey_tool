// FEATURE:      Merged Report Player
// SURFACE:      node --test src/apps/report-player/index.test.mjs
// WHY TOGETHER: Static shell assertions guard the Report Player entry document.
// STATE:        Loaded Report Player HTML
// RULES:        The page links modules and contains no inline result or access token.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Report Player HTML exposes one data-free merged feature mount", () => {
  assert.match(html, /data-app="report-player"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /data-report-root/);
  assert.match(html, /features\/report-player\/report-player\.css/);
  assert.doesNotMatch(html, /resultId|MAP_TOKEN|data-map-access/);
});
