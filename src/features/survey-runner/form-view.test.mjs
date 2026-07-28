import assert from "node:assert/strict";
import test from "node:test";

import { createRunnerFormView, preflightMetrics } from "./form-view.mjs";

function harness() {
  const nodes = new Map();
  const make = selector => {
    const node = {
      addEventListener(name, handler) {
        this.listeners[name] = handler;
      },
      dataset: {},
      disabled: false,
      hidden: false,
      innerHTML: "",
      listeners: {},
      textContent: "",
      value: "",
    };
    nodes.set(selector, node);
    return node;
  };
  const values = {
    deviceType: { value: "mobile" },
    deviceOs: { value: "ExampleOS 1" },
    deviceName: { value: "Phone" },
    clientIp: { value: "192.0.2.8" },
    band: { value: "5" },
    mapAccess: { value: "map" },
    appId: { value: "id" },
    appKey: { value: "key" },
    consent: { checked: true },
    override: { checked: false },
  };
  const form = make("[data-runner-entry]");
  form.elements = { namedItem: name => values[name] };
  for (const selector of [
    "[data-survey-select]", "[data-survey-name]", "[data-campus-name]",
    "[data-route-distance]", "[data-route-duration]", "[data-checkpoint-count]",
    '[data-credential-row="mapAccess"]', '[data-credential-row="appId"]',
    '[data-credential-row="appKey"]', '[data-action="preflight"]',
    '[data-action="go"]', "[data-preflight-override]",
    '[data-action="override-go"]', "[data-preflight-result]",
    "[data-preflight-light]", "[data-preflight-reasons]",
    "[data-preflight-position]", "[data-preflight-floor]",
    "[data-preflight-age]", "[data-preflight-rtt]",
    "[data-setup-panel]", "[data-setup-controls]",
    "[data-runner-status]", '[name="override"]',
  ]) make(selector);
  const classes = new Set();
  return {
    classes,
    nodes,
    values,
    view: createRunnerFormView({
      body: {
        classList: {
          toggle(name, enabled) {
            if (enabled) classes.add(name);
            else classes.delete(name);
          },
        },
      },
      querySelector: selector => nodes.get(selector) ?? null,
    }),
  };
}

test("form view reads operator values and keeps Go gated by green", () => {
  const { classes, nodes, values, view } = harness();
  assert.equal(view.readValues().deviceOs, "ExampleOS 1");
  view.setActions({ entryComplete: true, preflight: { verdict: "amber" } });
  assert.equal(nodes.get('[data-action="go"]').disabled, true);
  assert.equal(nodes.get("[data-preflight-override]").hidden, false);
  values.override.checked = true;
  view.setActions({ entryComplete: true, preflight: { verdict: "amber" } });
  assert.equal(nodes.get('[data-action="override-go"]').disabled, false);
  view.setActions({ entryComplete: true, preflight: { verdict: "green" } });
  assert.equal(nodes.get('[data-action="go"]').disabled, false);
  let changes = 0;
  view.bind({
    entryChanged: () => changes++,
    selectSurvey() {},
    preflight() {},
    go() {},
    overrideGo() {},
  });
  nodes.get('[name="override"]').listeners.input();
  assert.equal(changes, 1);
  view.setRunning(true);
  assert.equal(nodes.get("[data-setup-panel]").dataset.running, "true");
  assert.equal(nodes.get("[data-setup-controls]").hidden, true);
  assert.equal(classes.has("runner-running"), true);
  view.setRunning(false);
  assert.equal(classes.has("runner-running"), false);
  view.setStatus("Ready", "ok");
  assert.equal(nodes.get("[data-runner-status]").dataset.kind, "ok");
});
test("definition summary and preflight evidence render without secrets", () => {
  const { nodes, view } = harness();
  view.populateSurveys([{
    surveyId: "survey-1",
    customerName: "<Customer>",
    surveyName: "Level & route",
  }], "survey-1");
  assert.match(nodes.get("[data-survey-select]").innerHTML, /&lt;Customer&gt;/);
  assert.equal(nodes.get("[data-survey-select]").value, "survey-1");
  view.showDefinition({
    meta: {
      surveyName: "Route",
      campusName: "Campus",
      route: { distanceM: 23.8, estimatedDurationSeconds: 75 },
      credentialRequirements: { mapAccess: true, appId: true, appKey: false },
    },
    route: { checkpoints: [{}, {}, {}] },
  });
  assert.equal(nodes.get("[data-route-distance]").textContent, "24 m");
  assert.equal(nodes.get("[data-route-duration]").textContent, "1 min 15 s");
  assert.equal(nodes.get('[data-credential-row="appKey"]').hidden, true);
  view.renderPreflight({ verdict: "green", reasons: [] }, {
    normalized: {
      lat: -45.87,
      lng: 170.5,
      z: 1,
      fixTime: new Date().toISOString(),
    },
    roundTripMs: 90,
  });
  assert.equal(nodes.get("[data-preflight-light]").textContent, "GREEN");
  assert.equal(nodes.get("[data-preflight-rtt]").textContent, "90 ms");
});

test("preflight metrics expose empty and usable samples", () => {
  assert.deepEqual(
    preflightMetrics(null, 1000),
    { position: "No position", floor: "—", age: "—", rtt: "—" },
  );
  const metrics = preflightMetrics({
    normalized: {
      lat: -45.87,
      lng: 170.5,
      z: 1,
      fixTime: "1970-01-01T00:00:00.000Z",
    },
    roundTripMs: 10,
  }, 5000);
  assert.equal(metrics.position, "-45.870000, 170.500000");
  assert.equal(metrics.age, "5 s");
});
