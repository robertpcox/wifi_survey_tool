// FEATURE:      Report Player playback
// SURFACE:      node --test src/features/report-player/playback-view.test.mjs
// WHY TOGETHER: Fixture markup assertions prove the playback section renders independently.
// STATE:        Parsed report fixture
// RULES:        Rendering performs no parsing, fetching, or timing.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderPlaybackView } from "./playback-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("playback view renders clock, walker controls, trails, and capture evidence", () => {
  const html = renderPlaybackView(result);
  assert.match(html, /Walk evidence/);
  assert.match(html, /data-playback-seek/);
  assert.match(html, /data-playback-speed/);
  assert.match(html, /polls, check-ins, and capture events/);
});
