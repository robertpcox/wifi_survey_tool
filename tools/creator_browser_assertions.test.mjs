import assert from "node:assert/strict";
import test from "node:test";

import { creatorDownloadFindings } from "./creator_browser_assertions.mjs";

test("Creator browser assertions cover live metrics, warning, and secret boundaries", () => {
  const valid = {
    buildings: [{ id: "building-a", name: "Clinical Services Building" }],
    campusName: "Dunedin Hospital",
    choiceSummariesSeen: 3,
    stops: 3,
    legs: 2,
    checkpoints: 4,
    distanceText: "24.7 m",
    engageActionCount: 1,
    engageLocked: true,
    totalText: "44.7 s",
    coverageText: "Buildings: Clinical Services Building",
    filename: "00000000-0000-4000-8000-000000000001.definition.v3.json",
    immediateCommits: 3,
    layout: {
      route: { left: 0, right: 250, width: 250, height: 500 },
      map: { left: 270, right: 1200, width: 930, height: 700 },
    },
    mapAccessUsed: true,
    reengagePresent: false,
    routeMode: "MazeMap route geometry is active",
    shortWarningHidden: true,
    secretStored: false,
    storageEntries: 0,
    stopRecords: [
      { method: "map", lng: 170.5, lat: -45.87 },
      { method: "poi", lng: 170.50024, lat: -45.86998 },
      { method: "map", lng: 170.50031, lat: -45.87 },
    ],
    surveyId: "00000000-0000-4000-8000-000000000001",
    zLevelNames: { 1: "Level 00" },
    zLevels: [1],
  };
  assert.deepEqual(creatorDownloadFindings(valid), []);
  assert.equal(creatorDownloadFindings({
    ...valid,
    secretStored: true,
    distanceText: "0 m",
  }).length, 2);
  assert.match(
    creatorDownloadFindings({ ...valid, engageActionCount: 2 }).join("\n"),
    /expected one initial Engage action/,
  );
});
