// FEATURE:      Capture-note map features
// SURFACE:      linked GeoJSON route-anchor tests
// WHY TOGETHER: Exact coordinates and join IDs define the shared map contract.
// STATE:        None
// RULES:        Invalid positions are omitted; valid IDs remain identical.
// PROVENANCE:   Runner offline field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { notePointFeatures } from "./note-features.mjs";

test("note feature retains ground truth and typed route-anchor metadata", () => {
  const features = notePointFeatures([{
    id: "note-1",
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: "a".repeat(64),
      fromCheckpointId: "checkpoint-a",
      toCheckpointId: "checkpoint-b",
      legId: "leg-a-b",
    },
    note: "Proxy offline",
    trigger: "source-failure",
    openedAt: "2026-07-29T01:00:00Z",
    resumedAt: "2026-07-29T01:00:10Z",
    dwellSeconds: 10,
    groundTruth: { lng: 170.5, lat: -45.8, z: 2 },
  }]);
  assert.equal(features[0].id, "note-1");
  assert.equal(features[0].properties.noteId, "note-1");
  assert.equal(features[0].properties.fromCheckpointId, "checkpoint-a");
  assert.equal(features[0].properties.toCheckpointId, "checkpoint-b");
  assert.equal(features[0].properties.legId, "leg-a-b");
  assert.equal("checkpointId" in features[0].properties, false);
  assert.deepEqual(features[0].geometry.coordinates, [170.5, -45.8]);
});
