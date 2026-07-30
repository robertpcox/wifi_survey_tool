// FEATURE:      Dynamic room Runner form presentation
// SURFACE:      Dropdown ordering and route-free summary
// WHY TOGETHER: The selection label and selected summary are one discovery contract.
// STATE:        Minimal form-view DOM nodes
// RULES:        The template survey identity and geometry remain hidden.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";
import { createRunnerFormView } from "./form-view.mjs";

test("Dynamic room survey appears first and shows a live-built summary", () => {
  const selectors = [
    "[data-survey-select]",
    "[data-survey-name]",
    "[data-campus-name]",
    "[data-route-distance]",
    "[data-route-duration]",
    "[data-checkpoint-count]",
    '[data-credential-row="mapAccess"]',
    '[data-credential-row="appId"]',
    '[data-credential-row="appKey"]',
    '[data-credential-group="map-access"]',
    '[data-credential-group="cloud"]',
  ];
  const nodes = new Map(selectors.map(selector => [selector, {
    hidden: false,
    innerHTML: "",
    textContent: "",
    value: "",
  }]));
  const view = createRunnerFormView({
    querySelector: selector => nodes.get(selector) ?? null,
  });
  view.populateSurveys([{
    surveyId: "survey-1",
    customerName: "Customer",
    surveyName: "Planned route",
  }]);
  const options = nodes.get("[data-survey-select]").innerHTML;
  assert.ok(
    options.indexOf("Dynamic room survey") < options.indexOf("Planned route"),
  );
  view.showDefinition({
    meta: {
      surveyName: "Hidden template",
      campusName: "Campus",
      route: { distanceM: 99, estimatedDurationSeconds: 99 },
      credentialRequirements: { mapAccess: false, appId: true, appKey: true },
    },
    route: { checkpoints: [{}, {}] },
  }, { dynamic: true });
  assert.equal(nodes.get("[data-survey-name]").textContent, "Dynamic room survey");
  assert.equal(nodes.get("[data-route-distance]").textContent, "Built live");
  assert.equal(nodes.get("[data-route-duration]").textContent, "Built live");
  assert.equal(nodes.get("[data-checkpoint-count]").textContent, "0");
});
