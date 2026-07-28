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
          checkpoints: legs.length ? [
            checkpoint(0, "stop", "a", null),
            checkpoint(1, "intermediate", null, "leg-1"),
            checkpoint(2, "stop", "b", null),
          ] : [],
          shortLegs: legs.filter(leg => leg.distanceM < 10),
          spacingM,
        };
      },
      estimateRouteDuration(input) {
        const dwellSeconds = input.checkpoints.reduce(
          (total, checkpointValue) => total + checkpointValue.dwellSeconds,
          0,
        );
        return {
          walkingSeconds: input.distanceM,
          dwellSeconds,
          totalSeconds: input.distanceM + dwellSeconds,
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
  const result = await workflow.rebuild(stops, plan());
  assert.equal(result.distanceM, 8);
  assert.equal(result.checkpoints.length, 3);
  assert.deepEqual(result.checkpoints.map(value => value.dwellSeconds), [0, 5, 0]);
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
  const first = workflow.rebuild(stops, plan());
  const second = workflow.rebuild(stops, plan());
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
      plan: plan(),
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
function plan() {
  return {
    spacingM: 10,
    midLegDwellSeconds: 5,
    legEndDwellSeconds: 30,
  };
}

function checkpoint(sequence, type, stopId, legId) {
  return {
    id: `checkpoint-${sequence + 1}`,
    sequence,
    type,
    stopId,
    legId,
    lng: sequence,
    lat: 0,
    z: 0,
    spacingBasisM: 10,
  };
}
