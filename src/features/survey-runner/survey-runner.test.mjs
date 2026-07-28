import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountSurveyRunner } from "./survey-runner.mjs";

const definition = JSON.parse(await readFile(
  new URL("../../../data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json", import.meta.url),
));

function harness(sampleOverrides = {}) {
  const values = {
    deviceType: "mobile",
    deviceOs: "ExampleOS 1",
    deviceName: "Phone",
    clientIp: "192.0.2.8",
    band: "5",
    mapAccess: "memory-map",
    appId: "memory-id",
    appKey: ["memory", "key"].join("-"),
    consent: true,
    override: false,
  };
  const calls = { actions: null, finishes: [], sources: [], statuses: [] };
  const formView = {
    bind: actions => { calls.actions = actions; },
    populateSurveys() {},
    readValues: () => values,
    renderPreflight: value => { calls.preflight = value; },
    selectedSurveyId: () => definition.meta.surveyId,
    setActions: value => { calls.buttons = value; },
    setRunning: value => { calls.running = value; },
    setStatus: (...value) => calls.statuses.push(value),
    showDefinition: value => { calls.definition = value; },
  };
  const runView = {
    bind() {},
    comment: () => "Clear run",
    renderRun: run => { calls.run = run; },
    renderSource: sample => calls.sources.push(sample),
    showFinish: status => calls.finishes.push(status),
    showValidation() {},
  };
  const sample = {
    id: "poll-1",
    sourceId: "mazemap-cloud",
    sentAt: "2026-07-28T00:59:59.900Z",
    receivedAt: "2026-07-28T01:00:00.000Z",
    roundTripMs: 100,
    httpStatus: 200,
    success: true,
    normalized: {
      lat: -45.87248,
      lng: 170.50853,
      z: 1,
      fixTime: "2026-07-28T00:59:59.000Z",
      confidence: 0.9,
    },
    raw: { recorded: true },
    error: null,
    ...sampleOverrides,
  };
  const runner = mountSurveyRunner({
    credentials: createMemoryCredentialStore(),
    formView,
    runView,
    mapAdapter: {
      campusId: "566",
      async launch() {},
      drawPositionTrail() {},
      drawRoute() {},
      drawStops() {},
      drawWaypoints() {},
    },
    source: { id: "mazemap-cloud", poll: async () => sample },
    loadManifest: async () => ({
      schemaVersion: 3,
      surveys: [{
        surveyId: definition.meta.surveyId,
        path: "data/survey.json",
      }],
    }),
    loadDefinition: async () => structuredClone(definition),
    nowDate: () => new Date("2026-07-28T01:00:05.000Z"),
    setTimer: () => 1,
    clearTimer() {},
    createId: () => "result-controller",
    downloadFile() {},
  });
  return { calls, runner, values };
}

test("Runner loads one survey, gates Go, preflights, and aborts with export", async () => {
  const { calls, runner } = harness();
  await runner.ready;
  assert.equal(calls.definition.meta.surveyId, definition.meta.surveyId);
  assert.equal(calls.buttons.entryComplete, true);
  assert.equal(calls.buttons.preflight, null);
  await runner.actions.preflight();
  assert.equal(runner.state.preflight.verdict, "green");
  assert.equal(runner.state.polls.length, 1);
  assert.equal(calls.buttons.preflight.verdict, "green");
  runner.actions.go();
  assert.equal(calls.running, true);
  runner.actions.stop();
  assert.deepEqual(calls.finishes, ["aborted"]);
  const downloaded = runner.actions.download();
  assert.equal(downloaded.result.run.completionStatus, "aborted");
  assert.equal(downloaded.result.run.band, "5");
  assert.deepEqual(downloaded.result.meta, definition.meta);
});

test("amber start keeps Go disabled and records explicit override", async () => {
  const { calls, runner, values } = harness({
    normalized: {
      lat: -46,
      lng: 170.7,
      z: 1,
      fixTime: "2026-07-28T00:59:59.000Z",
      confidence: 0.9,
    },
  });
  await runner.ready;
  await runner.actions.preflight();
  assert.equal(runner.state.preflight.verdict, "amber");
  assert.equal(calls.buttons.preflight.verdict, "amber");
  runner.actions.go();
  assert.equal(runner.state.activeRun, null);
  values.override = true;
  runner.actions.overrideGo();
  assert.equal(runner.state.preflight.acknowledged, true);
  runner.actions.stop();
  assert.equal(runner.actions.download().result.run.preflight.acknowledged, true);
});

test("asset capture uses only Client IP polling and never geolocation", async () => {
  const { runner, values } = harness();
  values.deviceType = "asset";
  await runner.ready;
  await runner.actions.preflight();
  assert.equal(runner.state.polls.length, 1);
  assert.equal("geolocation" in runner.state, false);
  assert.equal(runner.state.entry.deviceType, "asset");
});
