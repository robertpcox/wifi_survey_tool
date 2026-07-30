// FEATURE:      Dynamic room Runner preflight
// SURFACE:      Route-free preflight verdict tests
// WHY TOGETHER: Readiness, usable fixes, and freshness define one launch gate.
// STATE:        Fixed samples and clock
// RULES:        Arbitrary clicked floors and positions have no planned-route warning.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";

import { evaluateDynamicRoomPreflight }
  from "./dynamic-room-preflight-v3.mjs";

const NOW = Date.parse("2026-07-30T01:00:05.000Z");

function sample(overrides = {}) {
  return {
    id: "poll-1",
    success: true,
    normalized: {
      lng: 179.9,
      lat: -10,
      z: 99,
      fixTime: "2026-07-30T01:00:01.000Z",
    },
    error: null,
    ...overrides,
  };
}

function evaluate(overrides = {}) {
  return evaluateDynamicRoomPreflight({
    sample: sample(),
    mapReady: true,
    sourceReady: true,
    nowMs: NOW,
    pollIntervalMs: 2000,
    ...overrides,
  });
}

test("fresh usable sample is green without route or floor assumptions", () => {
  assert.deepEqual(evaluate(), {
    verdict: "green",
    reasons: [],
    sampleId: "poll-1",
    acknowledged: false,
  });
});

test("map, source, and sample failures are independent red reasons", () => {
  const result = evaluate({
    mapReady: false,
    mapError: "private access rejected",
    sourceReady: false,
    sourceError: "configuration unavailable",
    sample: sample({
      success: false,
      normalized: null,
      error: "Positioning proxy returned HTTP 500",
    }),
  });
  assert.equal(result.verdict, "red");
  assert.equal(result.reasons.length, 3);
  assert.match(result.reasons[0].text, /map did not load.*private access/);
  assert.match(result.reasons[1].text, /source did not initialise.*configuration/);
  assert.match(result.reasons[2].text, /Client IP.*wireless network/);
});

test("a nominally successful sample still needs usable coordinates", () => {
  const result = evaluate({
    sample: sample({
      normalized: {
        lng: 170.5,
        lat: Number.NaN,
        z: 1,
        fixTime: "2026-07-30T01:00:01.000Z",
      },
    }),
  });
  assert.equal(result.verdict, "red");
  assert.match(result.reasons[0].text, /no usable position/i);
});

test("missing and stale fix times are amber on the current cadence", () => {
  const missing = evaluate({
    sample: sample({ normalized: { ...sample().normalized, fixTime: null } }),
  });
  assert.equal(missing.verdict, "amber");
  assert.match(missing.reasons[0].text, /did not report when/);
  const stale = evaluate({
    sample: sample({
      normalized: {
        ...sample().normalized,
        fixTime: "2026-07-30T00:59:00.000Z",
      },
    }),
  });
  assert.equal(stale.verdict, "amber");
  assert.match(stale.reasons[0].text, /stale.*65 seconds/);
});

test("freshness allows three polling cadences with a ten-second minimum", () => {
  const cadence = evaluate({
    pollIntervalMs: 10_000,
    sample: sample({
      normalized: {
        ...sample().normalized,
        fixTime: new Date(NOW - 30_000).toISOString(),
      },
    }),
  });
  assert.equal(cadence.verdict, "green");
  const over = evaluate({
    pollIntervalMs: 10_000,
    sample: sample({
      normalized: {
        ...sample().normalized,
        fixTime: new Date(NOW - 30_001).toISOString(),
      },
    }),
  });
  assert.equal(over.verdict, "amber");
});

test("invalid clocks fail before an apparently green verdict", () => {
  assert.throws(
    () => evaluate({ nowMs: Number.NaN }),
    /nowMs.*finite/,
  );
  assert.throws(
    () => evaluate({ pollIntervalMs: 0 }),
    /pollIntervalMs.*at least 1/,
  );
});
