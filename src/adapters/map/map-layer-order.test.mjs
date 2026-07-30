// FEATURE:      MazeMap overlay placement
// SURFACE:      Optional before-layer insertion tests
// WHY TOGETHER: One harness proves anchored insertion and the one-argument fallback.
// STATE:        Recorded addLayer argument lists
// RULES:        Missing style anchors must never be passed to addLayer.
// PROVENANCE:   Runner/report field feedback for 3D area-extrusion stacking

import assert from "node:assert/strict";
import test from "node:test";

import { addMapLayer, AREA_EXTRUSION_LAYER_ID } from "./map-layer-order.mjs";

test("existing area extrusion is used as the layer insertion anchor", () => {
  const calls = [];
  const map = {
    addLayer: (...args) => calls.push(args),
    getLayer: id => id === AREA_EXTRUSION_LAYER_ID ? { id } : undefined,
  };
  const layer = { id: "route-lines-lyr" };
  assert.equal(addMapLayer(map, layer, AREA_EXTRUSION_LAYER_ID), AREA_EXTRUSION_LAYER_ID);
  assert.deepEqual(calls, [[layer, AREA_EXTRUSION_LAYER_ID]]);
});

test("missing area extrusion falls back to one-argument append", () => {
  const calls = [];
  const map = {
    addLayer: (...args) => calls.push(args),
    getLayer: () => undefined,
  };
  const layer = { id: "route-lines-lyr" };
  assert.equal(addMapLayer(map, layer, AREA_EXTRUSION_LAYER_ID), undefined);
  assert.deepEqual(calls, [[layer]]);
});
