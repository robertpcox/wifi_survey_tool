// FEATURE:      MazeMap overlay placement
// SURFACE:      Optional before-layer insertion tests
// WHY TOGETHER: One harness proves wall priority, area fallback, and safe append.
// STATE:        Recorded addLayer argument lists
// RULES:        Missing style anchors must never be passed to addLayer.
// PROVENANCE:   Runner/report field feedback for 3D building stacking

import assert from "node:assert/strict";
import test from "node:test";

import {
  addMapLayer,
  AREA_EXTRUSION_LAYER_ID,
  BUILDING_EXTRUSION_LAYER_IDS,
  WALLS_EXTRUSION_LAYER_ID,
} from "./map-layer-order.mjs";

test("wall extrusion wins when both building anchors exist", () => {
  const calls = [];
  const map = {
    addLayer: (...args) => calls.push(args),
    getLayer: id => BUILDING_EXTRUSION_LAYER_IDS.includes(id) ? { id } : undefined,
  };
  const layer = { id: "route-lines-lyr" };
  assert.equal(
    addMapLayer(map, layer, BUILDING_EXTRUSION_LAYER_IDS),
    WALLS_EXTRUSION_LAYER_ID,
  );
  assert.deepEqual(calls, [[layer, WALLS_EXTRUSION_LAYER_ID]]);
});

test("area extrusion is the fallback when the wall layer is absent", () => {
  const calls = [];
  const map = {
    addLayer: (...args) => calls.push(args),
    getLayer: id => id === AREA_EXTRUSION_LAYER_ID ? { id } : undefined,
  };
  const layer = { id: "route-lines-lyr" };
  assert.equal(
    addMapLayer(map, layer, BUILDING_EXTRUSION_LAYER_IDS),
    AREA_EXTRUSION_LAYER_ID,
  );
  assert.deepEqual(calls, [[layer, AREA_EXTRUSION_LAYER_ID]]);
});

test("missing building extrusions fall back to one-argument append", () => {
  const calls = [];
  const map = {
    addLayer: (...args) => calls.push(args),
    getLayer: () => undefined,
  };
  const layer = { id: "route-lines-lyr" };
  assert.equal(addMapLayer(map, layer, BUILDING_EXTRUSION_LAYER_IDS), undefined);
  assert.deepEqual(calls, [[layer]]);
});
