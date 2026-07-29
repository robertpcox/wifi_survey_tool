// FEATURE:      Report Player route-anchored notes
// SURFACE:      Playback note visibility, walker hold, and resume transition
// WHY TOGETHER: One timed note proves Runner-to-Player timestamp-hold semantics.
// STATE:        Loaded report fixture with one injected capture note
// RULES:        Walker holds exact note ground truth from openedAt until resumedAt.
// PROVENANCE:   Runner offline field feedback

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { playbackFrame } from "./report-playback.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("route-anchored note holds exact UI position without changing route truth", () => {
  const result = structuredClone(fixture);
  result.notes = [{
    id: "note-1",
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: result.route.hash,
      fromCheckpointId: "checkpoint-b",
      toCheckpointId: "checkpoint-c",
      legId: "leg-a-c",
    },
    note: "Proxy offline",
    trigger: "source-failure",
    sourceError: "HTTP 503",
    openedAt: "2026-07-28T01:00:11.000Z",
    resumedAt: "2026-07-28T01:00:13.000Z",
    dwellSeconds: 2,
    groundTruth: { lng: 170.50025, lat: -45.87, z: 0 },
  }];
  const frame = playbackFrame(result, Date.parse("2026-07-28T01:00:12.000Z"));
  assert.equal(frame.notes[0].routeAnchor.routeHash, result.route.hash);
  assert.equal(frame.walker.noteHold, true);
  assert.equal(frame.walker.noteId, "note-1");
  assert.equal("fromCheckpointId" in frame.walker, false);
  assert.deepEqual(
    { lng: frame.walker.lng, lat: frame.walker.lat, z: frame.walker.z },
    result.notes[0].groundTruth,
  );
  assert.ok(frame.transitionTimes.includes(Date.parse(result.notes[0].resumedAt)));
});
