// FEATURE:      Dynamic room Runner composition
// SURFACE:      Dropdown selection through Go and safe Stop
// WHY TOGETHER: Mount wiring must dispatch the mode-specific preflight and active runner.
// STATE:        One complete entry, site definition, and source sample
// RULES:        Dynamic Go starts polling without planned progress.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { DYNAMIC_SURVEY_ID } from "./runner-mode.mjs";
import { mountSurveyRunner } from "./survey-runner.mjs";

const definition = JSON.parse(await readFile(new URL(
  "../../../data/fixtures/runner/definition.fixture.v3.json",
  import.meta.url,
)));

test("mounted Dynamic room survey reuses setup and starts a route-free session", async () => {
  let actions;
  const running = [];
  const polled = [];
  const values = {
    deviceType: "mobile",
    deviceOs: "Android 16",
    deviceName: "Phone",
    clientIp: "192.0.2.8",
    band: "5",
    mapAccess: "map",
    appId: "id",
    appKey: ["runtime", "key"].join("-"),
    consent: true,
    override: false,
    extraDevice1Label: "iPhone B",
    extraDevice1Ip: "192.0.2.9",
  };
  const formView = {
    bind: value => { actions = value; },
    populateSurveys() {},
    readValues: () => values,
    renderPreflight() {},
    selectedSurveyId: () => definition.meta.surveyId,
    setActions() {},
    setRunning: value => running.push(value),
    setStatus() {},
    showDefinition() {},
  };
  const dynamicView = {
    acceptsMapPoint: () => false,
    bind() {},
    hide() {},
    render() {},
  };
  const runView = {
    bind() {},
    comment: () => "",
    renderSource() {},
    resetSession() {},
  };
  const sample = {
    id: "poll-1",
    sourceId: "mazemap-cloud",
    sentAt: "2026-07-30T00:59:59.900Z",
    receivedAt: "2026-07-30T01:00:00.000Z",
    roundTripMs: 100,
    httpStatus: 200,
    success: true,
    normalized: {
      lat: -45.8724,
      lng: 170.5085,
      z: 1,
      fixTime: "2026-07-30T00:59:59.000Z",
      confidence: 0.9,
    },
    raw: {},
    error: null,
  };
  const runner = mountSurveyRunner({
    credentials: createMemoryCredentialStore(),
    formView,
    runView,
    dynamicView,
    mapAdapter: {
      ready: true,
      campusId: "566",
      async launch() {},
      drawPositionTrail() {},
      drawRoute() {},
      drawStops() {},
      drawWaypoints() {},
      setActiveLeg() {},
      clearTargetMarker() {},
      resizeMapSoon() {},
    },
    source: {
      id: "mazemap-cloud",
      poll: async request => (polled.push(request.clientIp), sample),
    },
    loadManifest: async () => ({
      surveys: [{ surveyId: definition.meta.surveyId, path: "survey.json" }],
    }),
    loadDefinition: async () => structuredClone(definition),
    nowDate: () => new Date("2026-07-30T01:00:05.000Z"),
    setTimer: () => 1,
    clearTimer() {},
  });
  await runner.ready;
  await actions.selectSurvey({ target: { value: DYNAMIC_SURVEY_ID } });
  await actions.preflight();
  assert.equal(runner.state.mode, "dynamic-room");
  assert.equal(runner.state.preflight.verdict, "green");
  actions.go();
  assert.equal(runner.state.activeRun.session.phase, "awaiting-point");
  assert.equal(runner.state.activeRun.session.dwellSeconds, 45);
  assert.equal(runner.state.activeRun.state.polls, runner.state.polls);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(polled.slice(-2).sort(), ["192.0.2.8", "192.0.2.9"]);
  assert.deepEqual(
    runner.state.activeRun.state.extraDevices.map(device => device.label),
    ["iPhone B"],
  );
  assert.equal(running.at(-1), true);
  assert.equal(actions.stop(), true);
  assert.equal(runner.state.activeRun.state.completionStatus, "aborted");
  assert.equal(actions.clearCapture(), true);
});
