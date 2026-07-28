import assert from "node:assert/strict";
import test from "node:test";

import {
  createCreatorWorkflow,
  shortLegWarning,
} from "./workflow.mjs";

function domainHarness() {
  const calls = { authored: [] };
  return {
    calls,
    domain: {
      createRouteLegV3(from, to, geometry, index) {
        return {
          id: `leg-${index + 1}`,
          fromStopId: from.id,
          toStopId: to.id,
          distanceM: geometry[0].distanceM,
          geometry,
        };
      },
      generateRouteCheckpointsV3(_stops, legs, spacingM) {
        return {
          checkpoints: legs.length ? [{ id: "checkpoint-1" }] : [],
          shortLegs: legs.filter(leg => leg.distanceM < 10),
          spacingM,
        };
      },
      estimateRouteDuration(input) {
        return {
          walkingSeconds: input.distanceM,
          dwellSeconds: input.checkpointCount * input.dwellSeconds,
          totalSeconds: input.distanceM
            + input.checkpointCount * input.dwellSeconds,
        };
      },
      authorSurveyDefinitionV3(input, options) {
        calls.authored.push({ input, options });
        return { schemaVersion: 3, input };
      },
      importSurveyDefinitionV3(value) {
        return { ...value, imported: true };
      },
    },
  };
}

const stops = [
  { id: "a", name: "Start", lng: 1, lat: 2, z: 0 },
  { id: "b", name: "Finish", lng: 3, lat: 4, z: 0 },
];
test("workflow routes, checkpoints, and estimates immediately", async () => {
  const harness = domainHarness();
  const workflow = createCreatorWorkflow({
    domain: harness.domain,
    routeProvider: async () => [{ distanceM: 8 }],
  });
  const result = await workflow.rebuild(stops, { spacingM: 10, dwellSeconds: 5 });
  assert.equal(result.distanceM, 8);
  assert.equal(result.checkpoints.length, 1);
  assert.deepEqual(result.duration, {
    walkingSeconds: 8,
    dwellSeconds: 5,
    totalSeconds: 13,
  });
  assert.match(shortLegWarning(result.shortLegs, stops), /Start → Finish \(8\.0 m\)/);
});
test("workflow ignores a route response superseded by a newer rebuild", async () => {
  const harness = domainHarness();
  const resolvers = [];
  const workflow = createCreatorWorkflow({
    domain: harness.domain,
    routeProvider: () => new Promise(resolve => resolvers.push(resolve)),
  });
  const first = workflow.rebuild(stops, { spacingM: 10, dwellSeconds: 5 });
  const second = workflow.rebuild(stops, { spacingM: 10, dwellSeconds: 5 });
  resolvers[0]([{ distanceM: 7 }]);
  assert.deepEqual(await first, { stale: true });
  resolvers[1]([{ distanceM: 12 }]);
  assert.equal((await second).distanceM, 12);
});
test("workflow authors without credentials and retains imported comparison input", () => {
  const harness = domainHarness();
  const now = () => new Date(0);
  const cryptoRef = {};
  const workflow = createCreatorWorkflow({
    domain: harness.domain,
    now,
    cryptoRef,
  });
  const imported = { previousDefinition: { schemaVersion: 3 } };
  workflow.author(
    {
      meta: { surveyId: "survey-a" },
      routeId: "route-a",
      plan: { spacingM: 10, dwellSeconds: 5 },
    },
    { stops, legs: [] },
    imported,
  );
  const call = harness.calls.authored[0];
  assert.equal(call.input.previousDefinition.schemaVersion, 3);
  assert.equal(call.input.checkpointSpacingM, 10);
  assert.deepEqual(call.options, { now, cryptoRef });
  assert.equal("credentials" in call.input, false);
  assert.equal("device" in call.input.meta, false);
  assert.equal("band" in call.input.meta, false);
});
test("workflow integrates with v3 authoring and preserves an unchanged reimport", async () => {
  const workflow = createCreatorWorkflow({
    now: () => new Date("2026-07-28T00:00:00.000Z"),
  });
  const routeStops = [
    { id: "stop-1", name: "Start", lng: 170.5, lat: -45.87, z: 0,
      poiId: null, poiName: null, locationType: "room",
      provenance: { method: "map" } },
    { id: "stop-2", name: "Finish", lng: 170.5002, lat: -45.87, z: 0,
      poiId: null, poiName: null, locationType: "room",
      provenance: { method: "map" } },
  ];
  const plan = { spacingM: 10, dwellSeconds: 5 };
  const route = await workflow.rebuild(routeStops, plan);
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
  const first = await workflow.author(parsed, { stops: routeStops, legs: route.legs });
  const imported = workflow.importDefinition(first);
  const second = await workflow.author(parsed, {
    stops: imported.stops,
    legs: imported.legs,
  }, imported);
  assert.deepEqual(second, first);
  assert.equal("device" in first.meta, false);
  assert.equal("band" in first.meta, false);
});
