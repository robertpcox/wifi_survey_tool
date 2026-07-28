import assert from "node:assert/strict";
import test from "node:test";

import {
  closeCreatorMapChoice,
  coordinateSummary,
  showCreatorMapChoice,
} from "./map-choice.mjs";

function harness() {
  const nodes = new Map([
    ["[data-map-choice]", { hidden: true }],
    ["[data-clicked-summary]", {}],
    ["[data-poi-summary]", {}],
    ["[data-map-choice-poi-action]", { disabled: false }],
  ]);
  return { find: selector => nodes.get(selector), nodes };
}

test("map choice contrasts exact-click and POI-centre coordinates", () => {
  const state = harness();
  showCreatorMapChoice(state.find, {
    clicked: { lng: 170.5, lat: -45.87, z: 1 },
    context: {
      poi: {
        id: "42",
        name: "Meeting room",
        center: { lng: 170.51, lat: -45.88, z: 1 },
      },
    },
  });
  assert.equal(state.nodes.get("[data-map-choice]").hidden, false);
  assert.match(state.nodes.get("[data-clicked-summary]").textContent, /170\.500000/);
  assert.match(state.nodes.get("[data-poi-summary]").textContent, /170\.510000/);
  assert.equal(state.nodes.get("[data-map-choice-poi-action]").disabled, false);
  closeCreatorMapChoice(state.find);
  assert.equal(state.nodes.get("[data-map-choice]").hidden, true);
});

test("map choice disables an unavailable POI centre", () => {
  const state = harness();
  showCreatorMapChoice(state.find, {
    clicked: { lng: 1, lat: 2, z: 3 },
    context: { poi: { id: "42", center: null } },
  });
  assert.match(state.nodes.get("[data-poi-summary]").textContent, /No POI centre/);
  assert.equal(state.nodes.get("[data-map-choice-poi-action]").disabled, true);
  assert.equal(coordinateSummary(), "coordinates unavailable");
});
