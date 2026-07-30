// FEATURE:      Run-from-file round-trip tests
// SURFACE:      Dynamic export through upload into a planned run start
// WHY TOGETHER: Re-runs are only comparable if the uploaded identity survives intact.
// STATE:        One finalised dynamic export re-run through a mounted Runner
// RULES:        The uploaded surveyId and route hash are never regenerated.
// PROVENANCE:   Run-from-file survey definition request

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { createDynamicRouteAuthor } from "./dynamic-route-author.mjs";
import { finaliseDynamicSurvey } from "./dynamic-survey-export.mjs";
import { mountSurveyRunner } from "./survey-runner.mjs";

const fixture = JSON.parse(await readFile(new URL(
  "../../../data/fixtures/runner/definition.fixture.v3.json",
  import.meta.url,
)));
const NOW = "2026-07-30T01:02:03.000Z";

async function exportDynamicDefinition() {
  const stops = structuredClone(fixture.route.stops);
  const routeAuthor = createDynamicRouteAuthor({
    routeBetween: async (from, to) => [from, to],
  });
  stops.forEach(stop => routeAuthor.commitStop(stop));
  const point = index => ({
    lng: stops[index].lng, lat: stops[index].lat, z: stops[index].z,
  });
  const middle = {
    lng: (stops[0].lng + stops[1].lng) / 2,
    lat: (stops[0].lat + stops[1].lat) / 2,
    z: stops[0].z,
  };
  const checkpoints = [
    { id: "checkpoint-1", sequence: 0, type: "stop", ...point(0),
      stopId: "stop-1", legId: null, spacingBasisM: 5, dwellSeconds: 45 },
    { id: "checkpoint-2", sequence: 1, type: "intermediate", ...middle,
      stopId: null, legId: "leg-1", spacingBasisM: 5, dwellSeconds: 0 },
    { id: "checkpoint-3", sequence: 2, type: "stop", ...point(1),
      stopId: "stop-2", legId: null, spacingBasisM: 5, dwellSeconds: 45 },
  ];
  return finaliseDynamicSurvey({
    routeAuthor,
    definitionInput: { meta: fixture.meta, routeId: "dynamic-room-route" },
    checkpoints,
    markSpacingM: 5,
    captureAfterRoute: () => ({
      entry: { deviceType: "mobile", deviceOs: "Android 16",
        deviceName: "Field handset", clientIp: "192.0.2.8", band: "5" },
      preflight: { verdict: "green", sampleId: "poll-1", acknowledged: false, reasons: [] },
      polls: [sample("poll-1")],
      checkIns: checkpoints.map(checkpoint => ({
        checkpointId: checkpoint.id,
        at: NOW,
        groundTruth: { lng: checkpoint.lng, lat: checkpoint.lat, z: checkpoint.z },
      })),
      events: [
        { type: "run-started", at: "2026-07-30T01:00:00.000Z" },
        { type: "run-completed", at: NOW },
      ],
      notes: [],
      startedAt: "2026-07-30T01:00:00.000Z",
      stoppedAt: NOW, exportedAt: NOW, completionStatus: "completed",
      operatorComment: "Original dynamic walk", resultId: "result-dynamic-1",
    }),
  }, {
    now: () => new Date(NOW),
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => "44444444-4444-4444-8444-444444444444",
    },
  });
}

function sample(id) {
  return {
    id,
    sourceId: "mazemap-cloud",
    sentAt: "2026-07-30T01:00:03.900Z",
    receivedAt: "2026-07-30T01:00:04.000Z",
    roundTripMs: 100, httpStatus: 200, success: true,
    normalized: {
      lat: fixture.route.stops[0].lat,
      lng: fixture.route.stops[0].lng,
      z: 1, fixTime: "2026-07-30T01:00:04.000Z", confidence: 0.9,
    },
    raw: {}, error: null,
  };
}

test("an exported dynamic definition re-runs as a planned survey unchanged", async () => {
  const output = await exportDynamicDefinition();
  assert.equal(output.definition.meta.route.checkpointSpacingM, 5);
  let actions;
  const runner = mountSurveyRunner({
    credentials: createMemoryCredentialStore(),
    formView: {
      bind: value => { actions = value; },
      populateSurveys() {},
      readValues: () => ({
        deviceType: "mobile", deviceOs: "Android 16", deviceName: "Phone",
        clientIp: "192.0.2.8", band: "5", mapAccess: "map", appId: "id",
        appKey: ["runtime", "key"].join("-"), consent: true, override: false,
      }),
      renderPreflight() {},
      selectedSurveyId: () => fixture.meta.surveyId,
      setActions() {}, setRunning() {}, setStatus() {},
      setSurveySelection() {}, showDefinition() {},
    },
    runView: { bind() {}, comment: () => "", renderSource() {}, renderRun() {} },
    dynamicView: { acceptsMapPoint: () => false, bind() {}, hide() {}, render() {} },
    mapAdapter: {
      ready: true, campusId: "566", async launch() {}, drawPositionTrail() {},
      drawRoute() {}, drawStops() {}, drawWaypoints() {}, fitRoute() {},
      setActiveLeg() {}, clearTargetMarker() {}, resizeMapSoon() {},
    },
    source: { id: "mazemap-cloud", poll: async () => sample("poll-live") },
    loadManifest: async () => ({
      surveys: [{ surveyId: fixture.meta.surveyId, path: "survey.json" }],
    }),
    loadDefinition: async () => structuredClone(fixture),
    nowDate: () => new Date("2026-07-30T01:00:05.000Z"),
    setTimer: () => 1,
    clearTimer() {},
  });
  await runner.ready;
  const uploaded = await actions.uploadDefinition({
    target: {
      files: [{
        name: output.files.definition.filename,
        text: async () => output.files.definition.content,
      }],
      value: "chosen",
    },
  });
  assert.equal(uploaded, true);
  assert.equal(runner.state.mode, "planned-route");
  assert.equal(runner.state.definition.meta.surveyId, output.definition.meta.surveyId);
  assert.equal(runner.state.definition.route.hash, output.definition.route.hash);
  await actions.preflight();
  assert.equal(runner.state.preflight.verdict, "green");
  actions.go();
  assert.ok(runner.state.activeRun);
  assert.equal(runner.state.activeRun.state.startedAt, "2026-07-30T01:00:05.000Z");
  assert.equal(runner.state.definition.route.checkpoints[1].type, "intermediate");
  assert.deepEqual(runner.state.definition, output.definition);
});
