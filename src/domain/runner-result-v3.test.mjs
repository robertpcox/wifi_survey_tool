import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSurveyResultV3,
  resultFilename,
} from "./runner-result-v3.mjs";

const definition = JSON.parse(await readFile(
  new URL("../../data/fixtures/runner/definition.fixture.v3.json", import.meta.url),
));

test("completed result preserves meta, route, device, band, sample, and filename", () => {
  const checkIns = definition.route.checkpoints.map((checkpoint, index) => ({
    checkpointId: checkpoint.id,
    at: `2026-07-28T01:00:0${index + 1}.000Z`,
    groundTruth: { lng: checkpoint.lng, lat: checkpoint.lat, z: checkpoint.z },
  }));
  const result = buildSurveyResultV3(
    options("completed", checkIns, " clear walk "),
  );
  assert.deepEqual(result.meta, definition.meta);
  assert.deepEqual(result.route, definition.route);
  assert.notEqual(result.meta, definition.meta);
  assert.deepEqual(result.run.device, {
    type: "mobile",
    os: "ExampleOS 1",
    name: "Field handset",
    clientIp: "192.0.2.8",
  });
  assert.equal(result.run.band, "5");
  assert.equal(result.run.operatorComment, "clear walk");
  assert.deepEqual(result.notes, []);
  assert.equal(result.polls[0].id, result.run.preflight.sampleId);
  assert.equal(result.run.pollingIntervalMs, definition.meta.sourceConfig.pollIntervalMs);
  assert.equal(
    resultFilename(result),
    "health-new-zealand__566__56600000-0000-4000-8000-000000000001"
      + "__2026-07-28T01-01-00Z.result.v3.json",
  );
});

test("aborted result validates with zero check-ins and an omitted comment", () => {
  const result = buildSurveyResultV3(options("aborted", [], " "));
  assert.equal(result.run.completionStatus, "aborted");
  assert.equal(result.run.operatorComment, null);
  assert.deepEqual(result.checkIns, []);
});

test("completed result preserves closed-area skips as events, not check-ins", () => {
  const checkpoints = definition.route.checkpoints;
  const checkIns = checkpoints.slice(1).map((checkpoint, index) => ({
    checkpointId: checkpoint.id,
    at: `2026-07-28T01:00:0${index + 2}.000Z`,
    groundTruth: { lng: checkpoint.lng, lat: checkpoint.lat, z: checkpoint.z },
  }));
  const input = options("completed", checkIns, null);
  input.events.splice(1, 0, { type: "checkpoint-skipped",
    checkpointId: checkpoints[0].id, at: "2026-07-28T01:00:01.000Z",
    reason: "area-closed" }, ...checkIns.map(item => (
    { type: "checkpoint-reached", checkpointId: item.checkpointId, at: item.at }
  )));
  const result = buildSurveyResultV3(input);
  assert.equal(result.checkIns.some(item => item.checkpointId === checkpoints[0].id), false);
  assert.equal(result.events.some(event => event.type === "checkpoint-skipped"), true);
});

test("capture note preserves distinct identity, route anchor, and held position", () => {
  const input = options("aborted", [], "offline");
  const routeAnchor = {
    type: "checkpoint-interval",
    routeHash: definition.route.hash,
    fromCheckpointId: null,
    toCheckpointId: "checkpoint-1",
    legId: null,
  };
  input.notes = [{
    id: "note-1",
    routeAnchor,
    note: "Wi-Fi disconnected",
    trigger: "source-failure",
    sourceError: "proxy offline",
    openedAt: "2026-07-28T01:00:10.000Z",
    resumedAt: "2026-07-28T01:00:22.000Z",
    dwellSeconds: 12,
    groundTruth: { lng: 170.5, lat: -45.87, z: 1 },
  }];
  input.events.splice(1, 0, {
    type: "capture-note",
    at: input.notes[0].openedAt,
    resumedAt: input.notes[0].resumedAt,
    dwellSeconds: 12,
    noteId: "note-1",
    routeAnchor,
  });
  const result = buildSurveyResultV3(input);
  assert.equal("checkpointId" in result.notes[0], false);
  assert.deepEqual(result.notes[0].routeAnchor, result.events[1].routeAnchor);
  assert.notEqual(result.notes[0].routeAnchor, result.events[1].routeAnchor);
});

function options(completionStatus, checkIns, operatorComment) {
  return {
    definition,
    entry: {
      deviceType: "mobile",
      deviceOs: "ExampleOS 1",
      deviceName: "Field handset",
      clientIp: "192.0.2.8",
      band: "5",
    },
    preflight: {
      verdict: "green",
      sampleId: "poll-1",
      acknowledged: false,
      reasons: [],
    },
    polls: [{
      id: "poll-1",
      sourceId: "mazemap-cloud",
      sentAt: "2026-07-28T00:59:59.900Z",
      receivedAt: "2026-07-28T01:00:00.000Z",
      roundTripMs: 100,
      httpStatus: 200,
      success: true,
      normalized: {
        lat: -45.87,
        lng: 170.5,
        z: 1,
        fixTime: "2026-07-28T00:59:59.000Z",
        confidence: 0.9,
      },
      raw: { provider: "fixture" },
      error: null,
    }],
    checkIns,
    events: [
      { type: "run-started", at: "2026-07-28T01:00:00.000Z" },
      { type: `run-${completionStatus}`, at: "2026-07-28T01:01:00.000Z" },
    ],
    startedAt: "2026-07-28T01:00:00.000Z",
    stoppedAt: "2026-07-28T01:01:00.000Z",
    exportedAt: "2026-07-28T01:01:00.000Z",
    completionStatus,
    operatorComment,
    resultId: `result-${completionStatus}`,
  };
}
