import { mkdir, writeFile } from "node:fs/promises";
import {
  firstReadable,
  loadBaseline,
  monofileInventory,
} from "./step1_baseline.mjs";

const root = new URL("../", import.meta.url);
const candidates = {
  source: [
    "current_tool/route_survey/index.html",
    "data/reference/route-survey-index.html",
  ],
  route: [
    "current_tool/route_survey/routes/route-L00-Survey.json",
    "data/routes/route-L00-Survey.json",
  ],
  capture: [
    "current_tool/report_player/route-survey-2026-07-27T08-10-20-847Z.json",
    "data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json",
    "data/captures/route-survey-2026-07-27T08-10-20-847Z.json",
  ],
};

function sessionReplay(capture) {
  const firstSources = ["cloud", "lipi"]
    .map(source => capture.samples.find(sample => sample.source === source))
    .filter(Boolean);
  return {
    provenance: "Minimal replay derived from the 2026-07-27 L00 capture.",
    fields: {
      clientIp: capture.meta.clientIp,
      configId: capture.meta.configId,
      lipiUrl: capture.meta.lipiUrl,
      pollInterval: capture.meta.intervalMs,
      wpSpacing: capture.meta.spacingM,
    },
    sessionMeta: {
      startedAt: capture.meta.startedAt,
      endedAt: capture.meta.endedAt,
      routeName: capture.meta.routeName,
    },
    stops: capture.stops.slice(0, 2),
    legs: [capture.legs[0]],
    waypoints: capture.waypoints.filter(waypoint => waypoint.legIdx === 0),
    samples: firstSources,
    events: capture.events.slice(0, 6),
  };
}

const source = await firstReadable(root, candidates.source);
const route = JSON.parse((await firstReadable(root, candidates.route)).text);
const capture = JSON.parse((await firstReadable(root, candidates.capture)).text);
const baseline = loadBaseline(source.text);
const replay = sessionReplay(capture);
const checkpoints = Object.fromEntries(
  [0, 5, 10, 15, 20, 30].map(spacing => [
    String(spacing),
    baseline.checkpoints(route.stops, capture.legs, spacing),
  ]),
);

const outputDir = new URL("../data/characterization/step1/", import.meta.url);
await mkdir(new URL("golden/", outputDir), { recursive: true });
await mkdir(new URL("fixtures/", outputDir), { recursive: true });
const writes = [
  ["monofile-inventory.json", monofileInventory(source.text, source.path)],
  ["fixtures/session-replay.json", replay],
  ["golden/checkpoints.json", checkpoints],
  ["golden/route-export.json", baseline.routeExport("L00 Survey", route.stops)],
  ["golden/session-export.json", baseline.sessionExport(replay)],
];
await Promise.all(writes.map(([path, value]) =>
  writeFile(new URL(path, outputDir), `${JSON.stringify(value, null, 2)}\n`),
));
console.log(`Recorded Step 1 goldens from ${source.path}`);
