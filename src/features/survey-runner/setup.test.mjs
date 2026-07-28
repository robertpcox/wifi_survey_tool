import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { createRunnerSetup } from "./setup.mjs";

test("setup selects definitions, reads entry state, and records poll samples", async () => {
  const values = {
    deviceType: "asset",
    deviceOs: "AssetOS 1",
    deviceName: "Tag 4",
    clientIp: "192.0.2.7",
    band: "mixed",
    consent: true,
    mapAccess: "map",
    appId: "id",
    appKey: ["runtime", "key"].join("-"),
  };
  const state = {
    definition: null,
    surveys: [],
    polls: [],
    preflight: null,
    activeRun: null,
    busy: false,
  };
  const source = {
    id: "mazemap-cloud",
    poll: async () => ({ id: "poll-1", success: true }),
  };
  const calls = { buttons: [], source: [] };
  const definition = {
    meta: {
      campusId: "566",
      credentialRequirements: {
        mapAccess: true,
        appId: true,
        appKey: true,
      },
      sourceConfig: {
        configId: "1185",
        pollIntervalMs: 2000,
        proxyBase: "/proxy",
      },
    },
    route: {
      checkpoints: [{ id: "checkpoint-1" }],
      legs: [{ id: "leg-1" }],
      stops: [{ id: "stop-1" }],
    },
  };
  const setup = createRunnerSetup({
    state,
    credentials: createMemoryCredentialStore(),
    source,
    mapAdapter: {
      campusId: "566",
      ready: true,
      drawRoute: value => { calls.route = value; },
      drawStops: value => { calls.stops = value; },
      drawWaypoints: value => { calls.points = value; },
      fitRoute: value => { calls.fit = value; },
      resizeMapSoon: () => { calls.resized = true; },
    },
    formView: {
      readValues: () => values,
      selectedSurveyId: () => "survey-1",
      setActions: value => calls.buttons.push(value),
      setRunning() {},
      showDefinition() {},
      populateSurveys() {},
      setStatus() {},
    },
    runView: {
      renderSource: sample => calls.source.push(sample),
    },
    runtime: {
      loadManifest: async () => ({
        surveys: [{ surveyId: "survey-1", path: "survey.json" }],
      }),
      loadDefinition: async () => definition,
      setTimer: () => 1,
      clearTimer() {},
    },
  });
  await setup.initialize();
  assert.equal(state.entry.deviceType, "asset");
  assert.equal(setup.entryComplete(), true);
  assert.equal(setup.pollLoop.intervalMs, 2000);
  assert.equal(calls.fit, definition.route);
  assert.equal(calls.resized, true);
  await setup.pollLoop.sampleOnce("preflight");
  assert.equal(state.polls[0].id, "poll-1");
  assert.equal(calls.source[0].id, "poll-1");
  assert.equal(calls.buttons.at(-1).entryComplete, true);
});
