// FEATURE:      Full-screen Player map evidence
// SURFACE:      Deterministic Player GeoJSON frame tests
// WHY TOGETHER: Raw, poll-pair, failure, history, and snap invariants share one frame assertion.
// STATE:        None
// RULES:        Scrubbable output is exact and never replaces raw evidence with a snap.
// PROVENANCE:   Scope/contracts/report_analysis.md playback map acceptance
import assert from "node:assert/strict";
import test from "node:test";
import { buildPlayerFeatureCollections } from "./player-map-features.mjs";

test("frame builds persistent changed fixes and exact paired poll evidence", () => {
  const frame = {
    walker: { lng: 170.1, lat: -45.1, z: 0 },
    latestFix: { lng: 170.4, lat: -45.4, z: 0 },
    polls: [
      poll("poll-1", "2026-01-01T00:00:01Z", 170.2),
      poll("poll-2", "2026-01-01T00:00:01Z", 170.2),
      poll("poll-3", "2026-01-01T00:00:03Z", 170.4),
      { id: "failed", success: false, normalized: null },
    ],
    evidence: {
      requests: [{ pollId: "live", inFlight: true, point: point(170.15, 0) }],
      requestSpans: [{ pollId: "live", points: [point(170.15, 0), point(170.18, 0)] }],
      failures: [{ pollId: "failed", point: point(170.19, 0) }],
      outcomes: [{ pollId: "poll-3", point: point(170.3, 0) }],
      pairs: [{
        pollId: "poll-3",
        routePoint: point(170.3, 0),
        ipsPoint: point(170.4, 0),
        floorMatch: true,
      }],
    },
    notes: [{
      id: "note-1",
      routeAnchor: {
        type: "checkpoint-interval", routeHash: "a".repeat(64),
        fromCheckpointId: "checkpoint-a", toCheckpointId: "checkpoint-b",
        legId: "leg-a-b",
      },
      note: "Offline",
      groundTruth: point(170.45, 0),
    }],
  };
  const features = buildPlayerFeatureCollections(frame, null);
  assert.equal(features["player-fix-history"].length, 2);
  assert.deepEqual(
    features["player-raw-fix"][0].geometry.coordinates,
    [170.4, -45.4],
  );
  assert.deepEqual(
    features["player-failures"][0].geometry.coordinates,
    [170.19, -45.8],
  );
  assert.equal(features["player-failures"][0].properties.pollId, "failed");
  assert.equal(features["player-notes"][0].properties.toCheckpointId, "checkpoint-b");
  assert.deepEqual(
    features["player-pair-connectors"][0].geometry.coordinates,
    [[170.3, -45.8], [170.4, -45.8]],
  );
});
test("wrong-floor pairs omit connectors and rejected snap leaves raw fix unchanged", () => {
  const raw = { lng: 170.5, lat: -45.8, z: 1 };
  const frame = {
    walker: { lng: 170.4, lat: -45.8, z: 0 },
    rawFix: raw,
    evidence: {
      pairs: [{
        pairId: "wrong-floor",
        routePoint: point(170.4, 0),
        ipsPoint: point(170.5, 1),
        floorMatch: false,
      }],
    },
  };
  const snap = {
    raw,
    candidate: { lng: 170.45, lat: -45.8, z: 0 },
    accepted: false,
    distanceM: 19,
    radiusM: 15,
  };
  const features = buildPlayerFeatureCollections(frame, snap);
  assert.equal(features["player-pair-connectors"].length, 0);
  assert.equal(features["player-snap-candidate"][0].properties.accepted, false);
  assert.equal(features["player-snap-radius"][0].properties.radiusM, 15);
  assert.deepEqual(raw, { lng: 170.5, lat: -45.8, z: 1 });
  assert.deepEqual(
    features["player-raw-fix"][0].geometry.coordinates,
    [170.5, -45.8],
  );
  assert.deepEqual(
    features["player-raw-fix"][0].properties,
    {
      role: "raw-fix", displayZ: 0, reportedZ: 1,
      floorMatch: false, wrongFloor: true, pollId: null, z: 1,
    },
  );
});
test("current domain pollEvidence aliases populate every persistent map concern", () => {
  const frame = {
    pollEvidence: {
      latestRawFix: { fix: point(170.6, 0) },
      inFlight: [{
        pollId: "poll-live",
        sentTruth: point(170.1, 0),
        routeSpan: {
          segments: [{ from: point(170.1, 0), to: point(170.2, 0) }],
        },
      }],
      failures: [{
        pollId: "poll-failed",
        status: "failure",
        markerTruth: point(170.25, 0),
      }],
      outcomes: [{
        pollId: "poll-ok",
        pairId: "poll:poll-ok",
        status: "changed-fix",
        routeEstimate: point(170.3, 0),
        rawFix: point(170.4, 0),
        floorMatch: true,
      }],
    },
  };
  const features = buildPlayerFeatureCollections(frame);
  assert.deepEqual(
    features["player-raw-fix"][0].geometry.coordinates,
    [170.6, -45.8],
  );
  assert.equal(features["player-request-rings"].length, 1);
  assert.equal(features["player-request-spans"].length, 1);
  assert.equal(features["player-failures"].length, 1);
  assert.equal(features["player-outcomes"].length, 1);
  assert.equal(features["player-ips-pairs"].length, 1);
  assert.equal(features["player-pair-connectors"].length, 1);
  assert.equal(features["player-outcomes"][0].id, "poll-ok");
  assert.equal(features["player-outcomes"][0].properties.pairId, "poll:poll-ok");
});

function point(lng, z) {
  return { lng, lat: -45.8, z };
}

function poll(id, fixTime, lng) {
  return {
    id,
    success: true,
    normalized: { ...point(lng, 0), fixTime },
  };
}
