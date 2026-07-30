// FEATURE:      Dynamic room Runner setup selection
// SURFACE:      Template loading and route suppression
// WHY TOGETHER: A dynamic selection reuses site/source metadata but none of its route drawing.
// STATE:        Two manifest entries and one selected dynamic mode
// RULES:        The first site profile is explicit and map overlays are cleared.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { DYNAMIC_SURVEY_ID } from "./runner-mode.mjs";
import { createRunnerSetup } from "./setup.mjs";

test("dynamic selection loads the first site profile without drawing its route", async () => {
  const calls = [];
  const state = {
    surveys: [
      { surveyId: "survey-first", path: "first.json" },
      { surveyId: "survey-second", path: "second.json" },
    ],
    definition: null,
    polls: [],
    preflight: null,
    activeRun: null,
    busy: false,
  };
  const definition = {
    meta: {
      campusId: "566",
      credentialRequirements: {
        mapAccess: false,
        appId: true,
        appKey: true,
      },
      sourceConfig: {
        configId: "1185",
        pollIntervalMs: 2000,
        proxyBase: "/proxy",
      },
    },
    route: { legs: [1], stops: [2], checkpoints: [3] },
  };
  const setup = createRunnerSetup({
    state,
    credentials: createMemoryCredentialStore(),
    source: { id: "mazemap-cloud", poll: async () => ({}) },
    mapAdapter: {
      ready: true,
      campusId: "566",
      drawRoute: value => calls.push(["route", value]),
      drawStops: value => calls.push(["stops", value]),
      drawWaypoints: value => calls.push(["points", value]),
      setActiveLeg() {},
      clearTargetMarker() {},
      resizeMapSoon() {},
    },
    formView: {
      readValues: () => ({
        deviceType: "mobile",
        deviceOs: "Android",
        deviceName: "Phone",
        clientIp: "192.0.2.8",
        band: "5",
        appId: "id",
        appKey: ["test", "key"].join("-"),
        consent: true,
      }),
      selectedSurveyId: () => DYNAMIC_SURVEY_ID,
      setActions() {},
      setRunning() {},
      showDefinition: (_value, flags) => calls.push(["summary", flags]),
    },
    runView: {},
    runtime: {
      loadDefinition: async entry => {
        calls.push(["loaded", entry.surveyId]);
        return definition;
      },
    },
  });
  await setup.selectSurvey({ target: { value: DYNAMIC_SURVEY_ID } });
  assert.equal(state.mode, "dynamic-room");
  assert.deepEqual(calls[0], ["loaded", "survey-first"]);
  assert.deepEqual(calls.find(call => call[0] === "summary"), [
    "summary",
    { dynamic: true },
  ]);
  assert.deepEqual(calls.filter(call => ["route", "stops", "points"].includes(call[0])), [
    ["route", []],
    ["stops", []],
    ["points", []],
  ]);
});
