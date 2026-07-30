import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { mountSurveyRunner, RUNNER_THREE_D } from "./survey-runner.mjs";
const definition = JSON.parse(await readFile(
  new URL("../../../data/fixtures/runner/definition.fixture.v3.json", import.meta.url),
));
assert.deepEqual(RUNNER_THREE_D, { animateWalls: true, show3dAssets: true });
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
  const calls = { actions: null, finishes: [], focusOrigins: [], resizes: 0,
    runningStates: [], sources: [], statuses: [] };
  const formView = {
    bind: actions => { calls.actions = actions; },
    populateSurveys() {},
    readValues: () => values,
    renderPreflight: value => { calls.preflight = value; },
    selectedSurveyId: () => definition.meta.surveyId,
    setActions: value => { calls.buttons = value; },
    setRunning: value => calls.runningStates.push(value),
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
      focusWaypoint: (checkpoint, view) => calls.focusOrigins.push(view.origin),
      resizeMapSoon: () => calls.resizes++,
    },
    source: { id: "mazemap-cloud", poll: async () => sample },
    loadManifest: async () => ({
      schemaVersion: 3,
      surveys: [{ surveyId: definition.meta.surveyId, path: "data/survey.json" }],
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

test("Runner loads, preflights, aborts, and clears without losing setup", async () => {
  const { calls, runner } = harness();
  await runner.ready;
  await runner.actions.preflight();
  assert.equal(runner.state.preflight.verdict, "green");
  assert.equal(runner.state.polls.length, 1);
  assert.equal(calls.buttons.preflight.verdict, "green");
  runner.actions.go();
  assert.deepEqual(calls.focusOrigins, [runner.state.polls[0].normalized]);
  assert.equal(calls.runningStates.at(-1), true);
  assert.equal(runner.actions.clearCapture(), false);
  runner.actions.stop();
  assert.deepEqual(calls.finishes, ["aborted"]);
  assert.equal(calls.runningStates.at(-1), false);
  const entry = runner.state.entry;
  assert.equal(runner.actions.clearCapture(), true);
  assert.equal(runner.state.definition, null);
  assert.deepEqual(runner.state.polls, []);
  assert.equal(runner.state.activeRun, null);
  assert.equal(runner.state.entry, entry);
  assert.equal(runner.credentials.read("appKey"), "memory-key");
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
  calls.actions.overrideChanged();
  assert.equal(runner.state.preflight.verdict, "amber");
  runner.actions.overrideGo();
  assert.equal(runner.state.preflight.acknowledged, true);
  runner.actions.stop();
  const downloaded = runner.actions.download();
  assert.equal(downloaded.result.run.completionStatus, "aborted");
  assert.equal(downloaded.result.run.preflight.acknowledged, true);
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
