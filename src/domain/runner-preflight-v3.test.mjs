import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { haversine } from "./geometry.mjs";
import { evaluateRunnerPreflight } from "./runner-preflight-v3.mjs";

const definition = JSON.parse(await readFile(
  new URL("../../data/fixtures/runner/definition.fixture.v3.json", import.meta.url),
));
const liveDefinition = definition;
const recordedPosition = JSON.parse(await readFile(new URL(
  "../../data/positioning/ndh-outpatient-level-00.mazemap-cloud.response.json",
  import.meta.url,
)));
const NOW = Date.parse("2026-07-28T01:00:05.000Z");

function sample(overrides = {}) {
  return {
    id: "poll-1",
    success: true,
    normalized: {
      lat: -45.87248,
      lng: 170.50853,
      z: 1,
      fixTime: "2026-07-28T01:00:01.000Z",
      confidence: 0.9,
    },
    error: null,
    ...overrides,
  };
}

function verdict(positionSample, mapReady = true, mapError = null) {
  return evaluateRunnerPreflight({
    definition,
    sample: positionSample,
    mapReady,
    mapError,
    nowMs: NOW,
  });
}

test("fresh, known-floor, near-campus sample is green", () => {
  const normalized = {
    lat: recordedPosition.latitude,
    lng: recordedPosition.longitude,
    z: recordedPosition.zLevel,
    fixTime: new Date(recordedPosition.lastSeen).toISOString(),
    confidence: recordedPosition.confidenceFactor,
  };
  const result = evaluateRunnerPreflight({
    definition: liveDefinition,
    sample: sample({ normalized }),
    mapReady: true,
    nowMs: recordedPosition.lastSeen + 5000,
  });
  assert.deepEqual(result, {
    verdict: "green",
    reasons: [],
    sampleId: "poll-1",
    acknowledged: false,
  });
  const distanceM = haversine(normalized, liveDefinition.route.stops[0]);
  assert.equal(distanceM < 10, true);
});

test("failed request, empty position, and private map failure are red", () => {
  const failed = verdict(sample({
    success: false,
    normalized: null,
    error: "Positioning proxy returned HTTP 500",
  }));
  assert.equal(failed.verdict, "red");
  assert.match(failed.reasons[0].text, /Client IP.*wireless network/);

  const empty = verdict(sample({ success: false, normalized: null }));
  assert.equal(empty.verdict, "red");
  assert.match(empty.reasons[0].text, /no usable position/i);

  const map = verdict(sample(), false, "private access was rejected");
  assert.equal(map.verdict, "red");
  assert.match(map.reasons[0].text, /map did not load.*private access/);
});

test("stale fix, unknown floor, and distant position are amber", () => {
  const stale = verdict(sample({
    normalized: { ...sample().normalized, fixTime: "2026-07-28T00:59:00.000Z" },
  }));
  assert.equal(stale.verdict, "amber");
  assert.match(stale.reasons[0].text, /stale.*65 seconds/);

  const floor = verdict(sample({
    normalized: { ...sample().normalized, z: 99 },
  }));
  assert.equal(floor.verdict, "amber");
  assert.match(floor.reasons[0].text, /floor 99.*not in this survey/);

  const distant = verdict(sample({
    normalized: { ...sample().normalized, lat: -46.0, lng: 170.7 },
  }));
  assert.equal(distant.verdict, "amber");
  assert.match(distant.reasons[0].text, /from the survey route/);
});
