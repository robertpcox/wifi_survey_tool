import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildSurveyResultV3,
  resultFilename,
} from "../src/domain/runner-result-v3.mjs";

const root = resolve(new URL("../", import.meta.url).pathname);
const definitionPath =
  "data/fixtures/runner/definition.fixture.v3.json";

export function buildRunnerFixtures(definition) {
  const sample = positionSample();
  const completed = buildSurveyResultV3(baseOptions({
    definition,
    sample,
    resultId: "runner-fixture-completed",
    completionStatus: "completed",
    entry: device("mobile", "FixtureOS 1", "Fixture handset", "5"),
    preflight: preflight("green", false),
    checkIns: allCheckIns(definition),
    operatorComment: "Completed deterministic Runner fixture.",
  }));
  const aborted = buildSurveyResultV3(baseOptions({
    definition,
    sample: distantSample(sample),
    resultId: "runner-fixture-aborted",
    completionStatus: "aborted",
    entry: device("asset", "AssetOS 2", "Fixture asset", "mixed"),
    preflight: preflight("amber", true),
    checkIns: [],
    operatorComment: null,
  }));
  return [completed, aborted];
}

export async function writeRunnerFixtures(repositoryRoot = root) {
  const definition = JSON.parse(
    await readFile(resolve(repositoryRoot, definitionPath), "utf8"),
  );
  const outputDir = resolve(repositoryRoot, "results");
  await mkdir(outputDir, { recursive: true });
  const fixtures = buildRunnerFixtures(definition);
  for (const result of fixtures) {
    await writeFile(
      resolve(outputDir, resultFilename(result)),
      `${JSON.stringify(result, null, 2)}\n`,
    );
  }
  return fixtures.map(resultFilename);
}

function baseOptions(options) {
  const stoppedAt = options.completionStatus === "completed"
    ? "2026-07-28T01:01:00.000Z"
    : "2026-07-28T02:00:05.000Z";
  return {
    ...options,
    polls: [options.sample],
    events: [
      { type: "run-started", at: "2026-07-28T01:00:00.000Z" },
      { type: `run-${options.completionStatus}`, at: stoppedAt },
    ],
    startedAt: "2026-07-28T01:00:00.000Z",
    stoppedAt,
    exportedAt: stoppedAt,
  };
}

function allCheckIns(definition) {
  return definition.route.checkpoints.map((checkpoint, index) => ({
    checkpointId: checkpoint.id,
    at: `2026-07-28T01:00:${String(5 + index * 6).padStart(2, "0")}.000Z`,
    groundTruth: {
      lng: checkpoint.lng,
      lat: checkpoint.lat,
      z: checkpoint.z,
    },
  }));
}

function device(type, os, name, band) {
  return {
    deviceType: type,
    deviceOs: os,
    deviceName: name,
    clientIp: "192.0.2.8",
    band,
  };
}

function preflight(verdict, acknowledged) {
  return {
    verdict,
    sampleId: "poll-fixture-1",
    acknowledged,
    reasons: verdict === "green" ? [] : [{
      level: "amber",
      text: "Recorded distant-position override.",
    }],
  };
}

function positionSample() {
  return {
    id: "poll-fixture-1",
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
    raw: {
      latitude: -45.87248,
      longitude: 170.50853,
      zLevel: 1,
      lastSeen: "2026-07-28T00:59:59.000Z",
      confidenceFactor: 0.9,
      recordedFixture: true,
    },
    error: null,
  };
}

function distantSample(sample) {
  const copy = structuredClone(sample);
  copy.normalized.lat = -46;
  copy.normalized.lng = 170.7;
  copy.raw.latitude = -46;
  copy.raw.longitude = 170.7;
  return copy;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const paths = await writeRunnerFixtures();
  console.log(`Generated Runner fixtures:\n${paths.join("\n")}`);
}
