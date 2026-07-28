// FEATURE:      Player live raw IPS evidence
// SURFACE:      Exact coordinate, reported-floor, and display-floor tests
// WHY TOGETHER: One raw feature must remain truthful while visible beside the walker.
// STATE:        None
// RULES:        Display placement never rewrites captured lng, lat, or reported z.
// PROVENANCE:   Scope/steps/05a_recast_player.md wrong-floor acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { liveRawFixFeature } from "./player-live-raw-fix.mjs";

test("wrong-floor raw fix keeps exact capture evidence on the walker display floor", () => {
  const feature = liveRawFixFeature({
    pollEvidence: {
      latestRawFix: { pollId: "poll-8", floorMatch: false },
    },
  }, {
    lng: 170.123456,
    lat: -45.654321,
    z: 2,
  }, {
    lng: 170.2,
    lat: -45.7,
    z: 0,
  });
  assert.deepEqual(feature.geometry.coordinates, [170.123456, -45.654321]);
  assert.deepEqual(feature.properties, {
    role: "raw-fix",
    displayZ: 0,
    reportedZ: 2,
    floorMatch: false,
    wrongFloor: true,
    pollId: "poll-8",
    z: 2,
  });
});

test("same-floor raw fix uses its reported floor as the display floor", () => {
  const feature = liveRawFixFeature(
    {},
    { lng: 170.5, lat: -45.8, z: 1 },
    { lng: 170.6, lat: -45.8, z: 1 },
  );
  assert.equal(feature.properties.displayZ, 1);
  assert.equal(feature.properties.reportedZ, 1);
  assert.equal(feature.properties.wrongFloor, false);
  assert.equal(feature.properties.floorMatch, true);
});
