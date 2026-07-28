// FEATURE:      Report Player shared map surface
// SURFACE:      node --test src/features/report-player/map-model.test.mjs
// WHY TOGETHER: Fixture projection assertions prove route, heat, floor, and playback composition.
// STATE:        Parsed report fixture
// RULES:        Floor labels come from meta even when a floor has no observed heat.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createMapFrame } from "./map-model.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("map frame composes embedded route and ground-truth heat by meta floor", () => {
  const mapFrame = createMapFrame(result, {
    floor: 0,
    heatKind: "sticky",
    analysis: {
      sticky: {
        heatByZ: {
          0: [{ lng: 170.5001, lat: -45.87, z: 0, weightSeconds: 2 }],
        },
      },
    },
    frame: {
      pollTrail: [{ normalized: { lng: 170.5001, lat: -45.87, z: 0 } }],
      walker: { lng: 170.50015, lat: -45.87, z: 0 },
    },
  });
  assert.equal(mapFrame.floorName, "Ground");
  assert.equal(mapFrame.heat[0].weightSeconds, 2);
  assert.equal(mapFrame.pollTrail.length, 1);
  assert.ok(mapFrame.routeLines.length);
  assert.ok(mapFrame.routeLines[0].at(-1).x - mapFrame.routeLines[0][0].x > 0.5);
  assert.ok(mapFrame.walker);
  assert.equal(createMapFrame(result, { floor: 1 }).floorName, "First");
});
