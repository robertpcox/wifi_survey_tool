// FEATURE:      V3 Report Player playback
// SURFACE:      Node tests for report-playback-timeline.mjs
// WHY TOGETHER: Bounds, cache identity, and transition ordering share one prepared timeline.
// STATE:        Deterministic report fixture
// RULES:        Preflight is absent and all exposed times are sorted and unique.
// PROVENANCE:   Scope/steps/05a_recast_player.md playback acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  playbackBounds,
  preparePlaybackTimeline,
} from "./report-playback-timeline.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("prepared playback timeline is cached, sorted, and preflight-free", () => {
  const first = preparePlaybackTimeline(fixture);
  assert.equal(preparePlaybackTimeline(fixture), first);
  assert.deepEqual(first.bounds, playbackBounds(fixture));
  assert.equal(
    first.pollCycles.some(item => item.poll.id === fixture.run.preflight.sampleId),
    false,
  );
  assert.deepEqual(
    first.transitionTimes,
    [...new Set(first.transitionTimes)].sort((left, right) => left - right),
  );
  assert.equal(first.eventTimes[0], Date.parse(fixture.run.startedAt));
  assert.equal(first.eventTimes.at(-1), Date.parse(fixture.run.stoppedAt));
});
