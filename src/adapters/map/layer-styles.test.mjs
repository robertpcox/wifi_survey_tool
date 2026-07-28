import test from "node:test";
import assert from "node:assert/strict";

import { MAP_STYLE } from "../../domain/route-contract.mjs";
import { createLayerStyles } from "./layer-styles.mjs";

const zCase = (z, color) => [
  "case",
  ["==", ["get", "z"], z],
  color,
  "#aaaaaa",
];
const zNumber = (z, on, off) => [
  "case",
  ["==", ["get", "z"], z],
  on,
  off,
];

test("layer paint definitions match the monofile map styling", () => {
  const styles = createLayerStyles(() => 2);

  assert.deepEqual(styles.route, {
    "line-width": 3,
    "line-color": zCase(2, MAP_STYLE.route),
    "line-opacity": zNumber(2, 0.75, 0.15),
    "line-dasharray": [2, 2],
  });
  assert.deepEqual(styles.activeRoute, {
    "line-width": 6,
    "line-color": zCase(2, MAP_STYLE.waypointCurrent),
    "line-opacity": zNumber(2, 0.95, 0.2),
  });
  assert.deepEqual(styles.trail("#123456"), {
    "line-width": 2.5,
    "line-color": zCase(2, "#123456"),
    "line-opacity": zNumber(2, 0.85, 0.15),
  });
  assert.deepEqual(styles.trailPoint("#123456"), {
    "circle-radius": ["case", ["==", ["get", "isLatest"], true], 8, 4],
    "circle-color": zCase(2, "#123456"),
    "circle-opacity": zNumber(2, 1, 0.25),
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2,
    "circle-stroke-opacity": zNumber(2, 1, 0.25),
  });
  assert.deepEqual(styles.waypoint["circle-radius"], [
    "case",
    ["==", ["get", "state"], "current"],
    10,
    ["==", ["get", "kind"], "stop"],
    8,
    5.5,
  ]);
  assert.deepEqual(styles.waypoint["circle-color"], [
    "match",
    ["get", "state"],
    "current",
    MAP_STYLE.waypointCurrent,
    "done",
    MAP_STYLE.waypointDone,
    "skipped",
    MAP_STYLE.waypointSkipped,
    MAP_STYLE.waypointPending,
  ]);
  assert.deepEqual(styles.stop, {
    "circle-radius": 11,
    "circle-color": "rgba(0,0,0,0)",
    "circle-stroke-color": zCase(2, "#0f172a"),
    "circle-stroke-width": 2.5,
    "circle-stroke-opacity": zNumber(2, 0.9, 0.2),
  });
});

test("applyTo refreshes every available layer for the current floor", () => {
  let z = 2;
  const calls = [];
  const styles = createLayerStyles(() => z);
  const map = {
    getLayer: () => ({}),
    setPaintProperty(layer, property, value) {
      calls.push([layer, property, value]);
      if (layer === "cloud-trail-lyr" && property === "line-color") {
        throw new Error("recorded map race");
      }
    },
  };
  z = 4;

  styles.applyTo(map);

  assert.equal(calls.length, 18);
  assert.deepEqual(calls[0], [
    "route-lines-lyr",
    "line-color",
    zCase(4, MAP_STYLE.route),
  ]);
  assert.deepEqual(calls.at(-1), [
    "stop-pts-lyr",
    "circle-stroke-opacity",
    zNumber(4, 0.9, 0.2),
  ]);
});
