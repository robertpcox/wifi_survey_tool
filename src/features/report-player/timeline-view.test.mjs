// FEATURE:      Report Player evidence timeline
// SURFACE:      node --test src/features/report-player/timeline-view.test.mjs
// WHY TOGETHER: One fixture render proves merged, ordered, escaped evidence.
// STATE:        Parsed report fixture
// RULES:        Exercise raw timing, HTTP, fix, check-in, and capture evidence.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  renderTimelineView,
  reportTimelineItems,
} from "./timeline-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("timeline renders the report fixture evidence in time order", () => {
  const fixture = structuredClone(result);
  fixture.polls[0].raw.provider = "<fixture & evidence>";
  fixture.events[1].note = 'Operator saw <stairs> & "delay"';
  const items = reportTimelineItems(fixture);
  const html = renderTimelineView(fixture);

  assert.equal(items.length, 14);
  assert.deepEqual(items.map(item => item.at), [
    "2026-07-28T01:00:00.000Z",
    "2026-07-28T01:00:02.000Z",
    "2026-07-28T01:00:02.000Z",
    "2026-07-28T01:00:04.000Z",
    "2026-07-28T01:00:06.000Z",
    "2026-07-28T01:00:08.000Z",
    "2026-07-28T01:00:10.000Z",
    "2026-07-28T01:00:10.000Z",
    "2026-07-28T01:00:11.000Z",
    "2026-07-28T01:00:12.000Z",
    "2026-07-28T01:00:14.000Z",
    "2026-07-28T01:00:16.000Z",
    "2026-07-28T01:00:18.000Z",
    "2026-07-28T01:00:20.000Z",
  ]);
  assert.match(html, /Sent/);
  assert.match(html, /100 ms/);
  assert.match(html, /200 · success/);
  assert.match(html, /fix time 2026-07-28T01:00:02.000Z/);
  assert.match(html, /Ground-truth check-in/);
  assert.match(html, /Capture event/);
  assert.match(html, /provider: &lt;fixture &amp; evidence&gt;/);
  assert.match(html, /Operator saw &lt;stairs&gt; &amp; &quot;delay&quot;/);
  assert.doesNotMatch(html, /\{"provider"/);
});
