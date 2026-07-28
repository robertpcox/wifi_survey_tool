// FEATURE:      Report Player poll evidence
// SURFACE:      Node tests for report-poll-timeline.mjs
// WHY TOGETHER: Identity ordering and route estimates are proved on one capture timeline.
// STATE:        Cloned deterministic report fixture
// RULES:        Preflight never seeds identity and failures never advance it.
// PROVENANCE:   Scope/contracts/report_analysis.md playback evidence acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildPlaybackPollTimeline } from "./report-poll-timeline.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const bounds = {
  startMs: Date.parse(fixture.run.startedAt),
  endMs: Date.parse(fixture.run.stoppedAt),
};

test("capture timeline excludes preflight and distinguishes identity from movement", () => {
  const cycles = timeline(fixture);
  assert.deepEqual(
    cycles.map(cycle => cycle.poll.id),
    ["poll-2", "poll-3", "poll-4", "poll-5", "poll-6", "poll-7", "poll-8"],
  );
  assert.equal(cycles[0].identityChanged, true);
  assert.equal(cycles[1].identityChanged, false);
  assert.equal(cycles[2].identityChanged, true);
  assert.equal(cycles[2].coordinatesMoved, true);
  assert.equal(cycles.at(-1).floorChanged, true);
  assert.ok(cycles.every(cycle => cycle.sentTruth && cycle.receivedTruth));
});

test("fresh same-position fix and moved same-time fix stay separately observable", () => {
  const fresh = structuredClone(fixture);
  fresh.polls[2].normalized.fixTime = fresh.polls[2].receivedAt;
  const freshCycle = timeline(fresh).find(item => item.poll.id === "poll-3");
  assert.equal(freshCycle.identityChanged, true);
  assert.equal(freshCycle.coordinatesMoved, false);
  assert.equal(freshCycle.fixAgeSeconds, 0);

  const moved = structuredClone(fixture);
  moved.polls[3].normalized.fixTime = moved.polls[2].normalized.fixTime;
  const movedCycle = timeline(moved).find(item => item.poll.id === "poll-4");
  assert.equal(movedCycle.identityChanged, false);
  assert.equal(movedCycle.coordinatesMoved, true);
});

test("missing fix time falls back to coordinates and floor", () => {
  const missing = structuredClone(fixture);
  for (const poll of missing.polls) delete poll.normalized.fixTime;
  const cycles = timeline(missing);
  assert.equal(cycles[1].identityChanged, false);
  assert.equal(cycles[2].identityChanged, true);
  assert.match(cycles[2].identity, /^position:/);
});

function timeline(result) {
  return buildPlaybackPollTimeline(
    result,
    bounds,
    buildGroundTruthModel(result),
  );
}
