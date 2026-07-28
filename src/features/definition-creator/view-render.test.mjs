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
  const stops = [
    {
      id: "stop-1",
      name: "Start <room>",
      lng: 170.5,
      lat: -45.87,
      z: 1,
      provenance: { method: "map" },
    },
    {
      id: "stop-2",
      name: "Finish",
      lng: 170.51,
      lat: -45.88,
      z: 2,
      provenance: { method: "poi" },
    },
  ];
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
  const stopHtml = elements.get("[data-stop-list]").innerHTML;
  assert.match(stopHtml, /Start &lt;room&gt;/);
  assert.doesNotMatch(stopHtml, /data-action="select-stop"|>Edit</);
  assert.equal((stopHtml.match(/data-action="remove-stop"/g) ?? []).length, 2);
  assert.match(stopHtml, /aria-label="Move stop 1 up" disabled/);
  assert.match(stopHtml, /aria-label="Move stop 1 down">/);
  assert.match(stopHtml, /aria-label="Move stop 2 up">/);
  assert.match(stopHtml, /aria-label="Move stop 2 down" disabled/);
  assert.equal(elements.get('[data-metric="distance"]').textContent, "0.0 m");
  assert.match(
    elements.get("[data-coverage-buildings]").textContent,
    /Building A/,
  );
  assert.match(elements.get("[data-coverage-floors]").textContent, /Level 00/);
});
