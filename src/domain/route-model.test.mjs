import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  alphaTag,
  normalizeStop,
  normalizeStops,
  parseRouteDefinition,
  routeDefinition,
} from "./route-model.mjs";

const routeFixture = new URL(
  "../../data/routes/route-L00-Survey.json",
  import.meta.url,
);
const routeGolden = new URL(
  "../../data/characterization/step1/golden/route-export.json",
  import.meta.url,
);

test("alphaTag advances through single and multiple letters", () => {
  assert.deepEqual(
    [0, 25, 26, 51, 52, 701].map(alphaTag),
    ["A", "Z", "AA", "AZ", "BA", "ZZ"],
  );
});

test("normalizeStop accepts nested coordinates and preserves POI context", () => {
  const stop = normalizeStop({
    target: { lng: "170.5", lat: "-45.8", z: "2" },
    poi_id: 17,
    poi: { title: "Room 17", lng: "invalid" },
    custom: "retained",
  }, 1);

  assert.deepEqual(stop.poi, {
    title: "Room 17",
    lng: 170.5,
    id: 17,
    label: "Room 17",
    lat: -45.8,
    z: 2,
  });
  assert.equal(stop.tag, "B");
  assert.equal(stop.label, "Room 17");
  assert.equal(stop.locationType, "poi");
  assert.equal(stop.targetType, "poi");
  assert.equal(stop.custom, "retained");
});

test("normalizeStop derives outdoor context and rejects invalid stops", () => {
  const stop = normalizeStop({
    lng: 1,
    lat: 2,
    poiName: "outdoor",
  }, 0);
  assert.equal(stop.locationType, "outdoors");
  assert.equal(stop.poiName, "outdoor");
  assert.equal(stop.targetType, "point");
  assert.throws(() => normalizeStop(null, 0), /stop 1 is not an object/);
  assert.throws(
    () => normalizeStop({ lng: 1, lat: "bad" }, 2),
    /stop 3 has invalid lng\/lat\/z/,
  );
});

test("normalizeStops validates the collection and assigns tags", () => {
  const stops = normalizeStops([
    { lng: 1, lat: 2 },
    { lng: 3, lat: 4, tag: "Custom" },
  ]);
  assert.deepEqual(stops.map(stop => stop.tag), ["A", "Custom"]);
  assert.throws(() => normalizeStops({}), /no stops array/);
});

test("parseRouteDefinition accepts arrays and rejects a foreign campus", () => {
  const parsed = parseRouteDefinition(
    [{ lng: "1", lat: "2" }],
    "Fallback",
  );
  assert.equal(parsed.name, "Fallback");
  assert.equal(parsed.stops[0].z, 1);
  assert.throws(
    () => parseRouteDefinition({
      campusId: 999,
      stops: [{ lng: 1, lat: 2 }],
    }, "Foreign"),
    /route campus 999 does not match campus 566/,
  );
  assert.throws(
    () => parseRouteDefinition({ campusId: 566, stops: [] }),
    /route has no stops/,
  );
});

test("routeDefinition is byte-identical to the saved-route golden", async () => {
  const [routeText, expected] = await Promise.all([
    readFile(routeFixture, "utf8"),
    readFile(routeGolden, "utf8"),
  ]);
  const route = JSON.parse(routeText);
  const actual = routeDefinition("L00 Survey", route.stops, {
    now: () => new Date("2026-07-28T00:00:00.000Z"),
  });
  assert.equal(`${JSON.stringify(actual, null, 2)}\n`, expected);
});
