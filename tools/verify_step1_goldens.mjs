import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateCheckpoints } from "../src/domain/checkpoints.mjs";
import { routeDefinition } from "../src/domain/route-model.mjs";
import { buildSession } from "../src/features/runner/session.mjs";
import { FIXED_ISO } from "./step1_baseline.mjs";

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
}

function serialize(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

const route = await readJson("../data/routes/route-L00-Survey.json");
const capture = await readJson(
  "../data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json",
);
const replay = await readJson(
  "../data/characterization/step1/fixtures/session-replay.json",
);
const fixedDate = () => new Date(FIXED_ISO);

const checkpoints = Object.fromEntries(
  [0, 5, 10, 15, 20, 30].map(spacing => [
    String(spacing),
    generateCheckpoints(route.stops, capture.legs, spacing),
  ]),
);
const session = buildSession({
  routeState: {
    stops: replay.stops,
    legs: replay.legs,
    waypoints: replay.waypoints,
  },
  sessionState: {
    meta: replay.sessionMeta,
    samples: replay.samples,
    events: replay.events,
  },
  config: replay.fields,
  nowDate: fixedDate,
});
const outputs = [
  ["checkpoints", checkpoints],
  ["route-export", routeDefinition("L00 Survey", route.stops, { now: fixedDate })],
  ["session-export", session],
];

for (const [name, actual] of outputs) {
  const expected = await readFile(
    new URL(`../data/characterization/step1/golden/${name}.json`, import.meta.url),
    "utf8",
  );
  assert.equal(serialize(actual), expected, `${name} differs from its golden`);
}

console.log("Step 1 split outputs are byte-identical to all three golden files.");
