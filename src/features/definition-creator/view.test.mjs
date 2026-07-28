import assert from "node:assert/strict";
import test from "node:test";
import { createDefinitionCreatorView } from "./view.mjs";
function harness() {
  const elements = new Map();
  const add = (selector, value = {}) => {
    const element = {
      dataset: {},
      disabled: false,
      hidden: false,
      innerHTML: "",
      textContent: "",
      value: "",
      ...value,
    };
    elements.set(selector, element);
    return element;
  };
  const fields = [
    "customerId", "customerName", "campusId", "campusName", "spacingM",
  ].map(name => add(
    `[data-field="${name}"]`,
    { dataset: { field: name } },
  ));
  const planInput = { disabled: false };
  add("[data-plan-fields]", {
    querySelectorAll: () => [planInput],
  });
  const planButton = add('[data-action="lock-plan"]');
  const stopFields = add("[data-stop-fields]");
  const engageButton = add('[data-action="engage-map"]', { textContent: "Engage" });
  const launchPanel = add("[data-launch-panel]");
  const campusSummary = add("[data-campus-summary]", { hidden: true });
  const engageFieldset = { disabled: true };
  const engageAction = { disabled: true };
  add("[data-stop-list]");
  add("[data-route-preview]");
  add("[data-route-mode]");
  add("[data-coverage-buildings]");
  add("[data-coverage-floors]");
  add("[data-short-warning]");
  add("[data-short-warning-text]");
  add("[data-gps-warning]");
  add("[data-creator-status]");
  add('[data-action="adjust-stop"]', { dataset: {} });
  add("[data-engage-access]", { value: "" });
  add("[data-map-choice]", { hidden: true });
  add("[data-clicked-summary]");
  add("[data-poi-summary]");
  add("[data-map-choice-poi-action]");
  add("[data-definition-file]", { addEventListener() {}, files: [] });
  for (const metric of ["distance", "checkpoints", "walking", "dwell", "total"]) {
    add(`[data-metric="${metric}"]`);
  }
  const root = {
    addEventListener() {},
    innerHTML: "",
    querySelector: selector => elements.get(selector),
    querySelectorAll(selector) {
      if (selector === "[data-field]") return fields;
      if (selector === "[data-requires-engagement]") return [engageFieldset];
      if (selector === "[data-requires-engagement-action]") return [engageAction];
      return [];
    },
    removeEventListener() {},
  };
  return { elements, engageAction, engageButton, engageFieldset,
    campusSummary, launchPanel, planButton, planInput, root, stopFields };
}
test("view reads fields and locks the plan before enabling stop controls", () => {
  const state = harness();
  const view = createDefinitionCreatorView(state.root);
  view.writeFields({
    campusId: "566", campusName: "Campus A", customerId: "customer-a",
    customerName: "Customer A", spacingM: 10,
  });
  assert.deepEqual(view.readFields(), {
    campusId: "566",
    campusName: "Campus A",
    customerId: "customer-a",
    customerName: "Customer A",
    spacingM: 10,
    _mapContext: null,
  });
  view.setEngaged(true);
  assert.equal(state.engageFieldset.disabled, false);
  assert.equal(state.engageAction.disabled, false);
  assert.equal(state.engageButton.textContent, "Engage");
  assert.equal(state.launchPanel.hidden, true);
  assert.equal(state.campusSummary.hidden, false);
  assert.match(state.campusSummary.textContent, /Customer A · Campus A/);
  view.setPlanLocked(true);
  assert.equal(state.planInput.disabled, true);
  assert.equal(state.planButton.disabled, false);
  assert.equal(state.planButton.textContent, "Change checkpoint plan");
  assert.equal(state.stopFields.disabled, false);
  view.setPlanLocked(false);
  assert.equal(state.planButton.textContent, "Lock checkpoint plan");
  assert.doesNotThrow(() => view.selectStop(null, -1));
});
test("view renders safe stops, route review, and distinct warnings", () => {
  const state = harness();
  const view = createDefinitionCreatorView(state.root);
  const stops = [{
    id: "a",
    name: "Start <door>",
    lng: 170.5,
    lat: -45.87,
    z: 0,
    locationType: "room",
    provenance: { method: "map" },
  }];
  const route = {
    legs: [],
    checkpoints: [],
    distanceM: 0,
    duration: { walkingSeconds: 0, dwellSeconds: 0, totalSeconds: 0 },
  };
  view.renderStops(stops);
  view.renderRoute(stops, route);
  view.renderCoverage({
    buildings: [{ id: "1", name: "Building A" }],
    zLevels: [0],
    zLevelNames: { 0: "Ground" },
  });
  assert.match(
    state.elements.get("[data-stop-list]").innerHTML,
    /Start &lt;door&gt;/,
  );
  assert.equal(state.elements.get('[data-metric="distance"]').textContent, "0.0 m");
  assert.match(
    state.elements.get("[data-coverage-buildings]").textContent,
    /Building A/,
  );
  view.showGpsWarning("Courtyard accuracy warning");
  view.showShortWarning("Start → Finish");
  view.setRouteMode("MazeMap routed");
  assert.equal(state.elements.get("[data-gps-warning]").hidden, false);
  assert.equal(state.elements.get("[data-short-warning-text]").textContent, "Start → Finish");
  assert.equal(state.elements.get("[data-route-mode]").textContent, "MazeMap routed");
});
