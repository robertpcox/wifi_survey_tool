import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { downloadRunnerResult } from "./result-download.mjs";

const definition = JSON.parse(await readFile(
  new URL("../../../data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json", import.meta.url),
));
const polls = [{
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
  raw: { recorded: true },
  error: null,
}];

test("download serializes a validated aborted result without credential values", () => {
  const downloads = [];
  const value = downloadRunnerResult({
    definition,
    entry: {
      deviceType: "asset",
      deviceOs: "AssetOS 3",
      deviceName: "Scanner 2",
      clientIp: "192.0.2.9",
      band: "mixed",
    },
    preflight: {
      verdict: "amber",
      sampleId: "poll-1",
      acknowledged: true,
      reasons: [{ level: "amber", text: "Recorded override" }],
    },
    polls,
    run: {
      progress: { checkIns: [] },
      events: [{ type: "run-started", at: "2026-07-28T01:00:00.000Z" }],
      startedAt: "2026-07-28T01:00:00.000Z",
      stoppedAt: "2026-07-28T01:00:05.000Z",
      completionStatus: "aborted",
    },
    operatorComment: "",
    nowDate: () => new Date("2026-07-28T01:00:06.000Z"),
    createId: () => "result-browser",
    downloadFile: (...args) => downloads.push(args),
  });
  assert.equal(value.result.run.preflight.acknowledged, true);
  assert.equal(value.result.run.device.type, "asset");
  assert.match(value.filename, /__2026-07-28T01-00-06Z\.result\.v3\.json$/);
  assert.equal(downloads[0][2], "application/json");
  assert.equal(downloads[0][1].includes("in-memory-key"), false);
});
