// FEATURE:      Creator definition workflow
// SURFACE:      Per-checkpoint dwell authoring and reimport integration test
// WHY TOGETHER: Author, export shape, import, and unchanged reauthor form one round trip.
// STATE:        In-memory previous definition
// RULES:        Explicit checkpoint dwell survives without rotating an unchanged survey.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorWorkflow } from "./workflow.mjs";

test("workflow preserves explicit dwell through an unchanged reimport", async () => {
  const workflow = createCreatorWorkflow({
    now: () => new Date("2026-07-28T00:00:00.000Z"),
  });
  const stops = [
    { id: "stop-1", name: "Start", lng: 170.5, lat: -45.87, z: 0,
      poiId: null, poiName: null, locationType: "room",
      provenance: { method: "map" } },
    { id: "stop-2", name: "Finish", lng: 170.5002, lat: -45.87, z: 0,
      poiId: null, poiName: null, locationType: "room",
      provenance: { method: "map" } },
  ];
  const plan = {
    spacingM: 10,
    midLegDwellSeconds: 5,
    legEndDwellSeconds: 30,
  };
  const route = await workflow.rebuild(stops, plan);
  const parsed = {
    meta: {
      surveyId: "survey-a", surveyName: "Survey A",
      customerId: "customer-a", customerName: "Customer A",
      campusId: "campus-a", campusName: "Campus A",
      timezone: "Australia/Melbourne",
      buildings: [{ id: "a", name: "A" }],
      zLevels: [0], zLevelNames: { 0: "Ground" },
      positionSourceId: "mazemap-cloud", authorNotes: null, authorName: null,
      sourceConfig: { configId: "1", pollIntervalMs: 2000, proxyBase: "/proxy" },
      credentialRequirements: {
        mapAccess: false, appId: true, appKey: true, clientIp: true,
      },
    },
    routeId: "route-a",
    plan,
  };
  const first = await workflow.author(parsed, {
    stops,
    legs: route.legs,
    checkpoints: route.checkpoints,
  });
  assert.deepEqual(
    first.route.checkpoints.map(checkpoint => checkpoint.dwellSeconds),
    [0, 0],
  );
  const imported = workflow.importDefinition(first);
  const second = await workflow.author(parsed, {
    stops: imported.stops,
    legs: imported.legs,
    checkpoints: imported.previousDefinition.route.checkpoints,
  }, imported);
  assert.deepEqual(second, first);
  assert.equal("device" in first.meta, false);
  assert.equal("band" in first.meta, false);
});
