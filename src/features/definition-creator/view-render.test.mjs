import assert from "node:assert/strict";
import test from "node:test";

import {
  renderCreatorCoverage,
  renderCreatorRoute,
  renderCreatorStops,
} from "./view-render.mjs";

function harness() {
  const elements = new Map();
  const find = selector => {
    if (!elements.has(selector)) {
      elements.set(selector, { innerHTML: "", textContent: "" });
    }
    return elements.get(selector);
  };
  return { elements, find };
}

test("view renderers safely show stops, route metrics, and map coverage", () => {
  const { elements, find } = harness();
  const stops = [{
    id: "stop-1",
    name: "Start <room>",
    lng: 170.5,
    lat: -45.87,
    z: 1,
    provenance: { method: "map" },
  }];
  renderCreatorStops(find, stops);
  renderCreatorRoute(find, stops, {
    checkpoints: [],
    distanceM: 0,
    duration: { dwellSeconds: 0, totalSeconds: 0, walkingSeconds: 0 },
    legs: [],
  });
  renderCreatorCoverage(find, {
    buildings: [{ id: "101", name: "Building A" }],
    zLevels: [1],
    zLevelNames: { 1: "Level 00" },
  });
  assert.match(elements.get("[data-stop-list]").innerHTML, /Start &lt;room&gt;/);
  assert.equal(elements.get('[data-metric="distance"]').textContent, "0.0 m");
  assert.match(
    elements.get("[data-coverage-buildings]").textContent,
    /Building A/,
  );
  assert.match(elements.get("[data-coverage-floors]").textContent, /Level 00/);
});
