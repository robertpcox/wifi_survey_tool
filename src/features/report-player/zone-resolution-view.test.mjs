// FEATURE:      MazeMap zone-match report
// SURFACE:      node --test src/features/report-player/zone-resolution-view.test.mjs
// WHY TOGETHER: Zone-only copy, grouping, and evidence share one compact fixture.
// STATE:        Synthetic zone summary
// RULES:        Name zone containment separately from enclosing room containment.
// PROVENANCE:   Zone-only local containment report

import assert from "node:assert/strict";
import test from "node:test";

import { renderRoomResolutionView } from "./room-resolution-view.mjs";

test("zone view names the separate containment rule and zone evidence", () => {
  const summary = {
    runCount: 2, observationCount: 3,
    visitCount: 2, scoredVisitCount: 2, resolvedVisitCount: 1,
    failedVisitCount: 1, unscoredVisitCount: 0,
    rooms: [{
      poiId: "zone-1", identifier: "Z01", name: "Bed bay", z: 2,
      floorName: "Level 2", visits: 2, resolved: 1, failures: 1,
      unscored: 0, maxOutsideDistanceM: 1.4,
    }],
    areaObservations: [{
      resultId: "result-zone", checkpointId: "checkpoint-zone",
      observationKind: "dwell", scored: true, resolved: false,
      device: { name: "Phone <zone>" },
      expectedRoom: { id: "zone-1", identifier: "Z01", name: "Bed bay" },
      primary: {
        status: "wrong-room", outsideDistanceM: 1.4,
        room: { id: "zone-2", identifier: "Z02", name: "Desk bay" },
      },
    }],
    corridor: {
      sampleCount: 1, scoredSampleCount: 1, resolvedSampleCount: 0,
      failedSampleCount: 1, unscoredSampleCount: 0,
      corridors: [{
        poiId: "zone-1", identifier: "Z01", name: "Bed bay", z: 2,
        samples: 1, resolved: 0, failures: 1, unscored: 0,
        maxOutsideDistanceM: 2.2,
      }], observations: [],
    },
  };
  const html = renderRoomResolutionView({
    status: "ready", summary, areaKind: "zone", showDevice: true,
  });
  assert.match(html, /Raw Cisco versus MazeMap zones/);
  assert.match(html, /kind: zone/);
  assert.match(html, /room polygons are ignored/);
  assert.match(html, /Blue dot resolved in zone/);
  assert.match(html, /Z01/);
  assert.match(html, /Bed bay/);
  assert.match(html, /3 eligible zone observations/);
  assert.match(html, /Wrong zone/);
  assert.match(html, /Z02 · Desk bay/);
  assert.match(html, /Phone &lt;zone&gt;/);
  assert.match(html, /2\.2 m/);
});

test("zone view has an explicit empty eligible-target state", () => {
  const html = renderRoomResolutionView({
    status: "ready", areaKind: "zone", summary: { observationCount: 0 },
  });
  assert.match(html, /Zone match outcomes/);
  assert.match(html, /No eligible surveyed stops or walking checkpoints fall inside/);
});
