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
  const calls = { buttons: [], resets: [], source: [] };
  const credentials = createMemoryCredentialStore();
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
    credentials,
    source,
    mapAdapter: {
      campusId: "566",
      ready: true,
      drawRoute: value => { calls.route = value; },
      drawPositionTrail: value => { calls.trail = value; },
      drawStops: value => { calls.stops = value; },
      drawWaypoints: value => { calls.points = value; },
      fitRoute: value => { calls.fit = value; },
      clearTargetMarker: () => calls.resets.push("target"),
      resizeMapSoon: () => { calls.resized = true; },
      setActiveLeg: value => { calls.activeLeg = value; },
    },
    formView: {
      readValues: () => values,
      selectedSurveyId: () => "survey-1",
      setActions: value => calls.buttons.push(value),
      setRunning() {},
      showDefinition() {},
      populateSurveys: (surveys, selectedId) => {
        calls.surveys = surveys;
        calls.selectedId = selectedId;
      },
      resetRouteSelection: () => calls.resets.push("form"),
      setStatus() {},
    },
    runView: {
      resetSession: () => calls.resets.push("run"),
      renderSource: sample => calls.source.push(sample),
    },
    runtime: {
      loadManifest: async () => ({
        surveys: [
          { surveyId: "survey-0", path: "survey-0.json" },
          { surveyId: "survey-1", path: "survey-1.json" },
        ],
      }),
      loadDefinition: async entry => {
        calls.loadedId = entry.surveyId;
        return definition;
      },
      locationRef: {
        href: "https://demo.mazemap.com.au/wifi-survey-v3/runner/"
          + "?survey_id=survey-1",
      },
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
  assert.equal(calls.selectedId, "survey-1");
  assert.equal(calls.loadedId, "survey-1");
  await setup.pollLoop.sampleOnce("preflight");
  assert.equal(state.polls[0].id, "poll-1");
  assert.equal(calls.source[0].id, "poll-1");
  assert.equal(calls.buttons.at(-1).entryComplete, true);
  state.activeRun = {};
  state.lastResult = {};
  state.preflight = { verdict: "green" };
  setup.resetAfterDownload();
  assert.equal(state.definition, null);
  assert.equal(state.activeRun, null);
  assert.equal(state.lastResult, null);
  assert.deepEqual(state.polls, []);
  assert.deepEqual(calls.route, []);
  assert.deepEqual(calls.stops, []);
  assert.deepEqual(calls.points, []);
  assert.deepEqual(calls.trail, []);
  assert.deepEqual(calls.resets, ["target", "form", "run"]);
  assert.equal(calls.activeLeg, null);
  assert.equal(state.entry.deviceName, "Tag 4");
  assert.equal(credentials.read("appKey"), values.appKey);
});
