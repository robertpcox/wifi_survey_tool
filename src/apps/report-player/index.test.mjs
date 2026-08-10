// FEATURE:      Merged Report Player app
// SURFACE:      node --test src/apps/report-player/index.test.mjs
// WHY TOGETHER: Static shell assertions guard the single-route Report and Player entry document.
// STATE:        Loaded Report Player HTML
// RULES:        The page links modules and contains no inline result or access token.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("./index.html", import.meta.url), "utf8");

test("Report Player HTML exposes one data-free merged feature mount", () => {
  assert.match(html, /data-app="report-player"/);
  assert.match(html, /type="module" src="\.\/main\.mjs"/);
  assert.match(html, /data-report-root/);
  assert.match(html, /features\/report-player\/report-player\.css/);
  assert.match(html, /features\/report-player\/campus-run-selection\.css/);
  assert.match(html, /features\/report-player\/report-warnings\.css/);
  assert.match(html, /features\/report-player\/report-insights\.css/);
  assert.match(html, /features\/report-player\/report-summary\.css/);
  assert.equal((html.match(/data-report-root/g) ?? []).length, 1);
  assert.doesNotMatch(html, /iframe|playback\.html|player\.html/);
  assert.doesNotMatch(html, /resultId|MAP_TOKEN|data-map-access/);
});
