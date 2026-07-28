import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  generateCheckpoints,
  generateWaypoints,
} from "./checkpoints.mjs";

const routeFixture = new URL(
  "../../data/routes/route-L00-Survey.json",
  import.meta.url,
);
const captureFixture = new URL(
  "../../data/reference/report_player/"
    + "route-survey-2026-07-27T08-10-20-847Z.json",
  import.meta.url,
);
const checkpointGolden = new URL(
  "../../data/characterization/step1/golden/checkpoints.json",
  import.meta.url,
);
const earthRadiusM = 6_371_000;

function equatorPoint(distanceM, z = 1) {
  return {
    lng: distanceM / earthRadiusM * 180 / Math.PI,
    lat: 0,
    z,
  };
}

function straightRoute(distanceM, splitAtM) {
  const stops = [
    { label: "Start", lng: 0, lat: 0, z: 1 },
    { label: "End", ...equatorPoint(distanceM) },
  ];
  const coords = splitAtM == null
    ? [equatorPoint(0), equatorPoint(distanceM)]
    : [
      equatorPoint(0),
      equatorPoint(splitAtM),
      equatorPoint(distanceM),
    ];
  return {
    stops,
    legs: [{ fromIdx: 0, toIdx: 1, coords }],
  };
}

test("saved-route checkpoints match the six-spacing golden byte for byte", async () => {
  const [routeText, captureText, expected] = await Promise.all([
    readFile(routeFixture, "utf8"),
    readFile(captureFixture, "utf8"),
    readFile(checkpointGolden, "utf8"),
  ]);
  const route = JSON.parse(routeText);
  const capture = JSON.parse(captureText);
  const actual = Object.fromEntries(
    [0, 5, 10, 15, 20, 30].map(spacing => [
      String(spacing),
      generateCheckpoints(route.stops, capture.legs, spacing),
    ]),
  );
  assert.equal(`${JSON.stringify(actual, null, 2)}\n`, expected);
});

test("9.9, 10.0, and 10.1 metre legs add no bunched midpoint", () => {
  for (const distanceM of [9.9, 10, 10.1]) {
    const route = straightRoute(distanceM);
    const checkpoints = generateCheckpoints(route.stops, route.legs, 10);
    assert.deepEqual(
      checkpoints.map(checkpoint => checkpoint.kind),
      ["stop", "stop"],
      `${distanceM} metre leg`,
    );
  }
});

test("a single-stop route has no leg checkpoints", () => {
  const stops = [{ label: "Only stop", ...equatorPoint(0) }];
  assert.deepEqual(generateCheckpoints(stops, [], 10), []);
});

test("a single leg between two stops retains both endpoint checkpoints", () => {
  const route = straightRoute(20);
  const checkpoints = generateCheckpoints(route.stops, route.legs, 0);
  assert.deepEqual(
    checkpoints.map(({ id, seq, kind, name, stopIdx }) => ({
      id,
      seq,
      kind,
      name,
      stopIdx,
    })),
    [
      { id: 0, seq: 0, kind: "stop", name: "A — Start", stopIdx: 0 },
      { id: 1, seq: 1, kind: "stop", name: "B — End", stopIdx: 1 },
    ],
  );
});

test("spacing remainder carries into the final path segment", () => {
  const route = straightRoute(18, 6);
  const checkpoints = generateCheckpoints(route.stops, route.legs, 10);
  assert.deepEqual(
    checkpoints.map(checkpoint => checkpoint.kind),
    ["stop", "mid", "stop"],
  );
  assert.ok(
    Math.abs(checkpoints[1].lng - equatorPoint(10).lng) < 1e-15,
  );
});

test("generateWaypoints remains the public alias for checkpoint generation", () => {
  assert.equal(generateWaypoints, generateCheckpoints);
});
