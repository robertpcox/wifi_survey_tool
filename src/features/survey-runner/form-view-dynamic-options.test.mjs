// FEATURE:      Dynamic room Runner entry option tests
// SURFACE:      Injected dynamic fieldset markup and dynamic-only visibility
// WHY TOGETHER: The injected options and their planned-route hiding form one contract.
// STATE:        Fake entry form recording injected markup
// RULES:        Injection happens once and defaults the dwell choice to 45 seconds.
// PROVENANCE:   Dynamic room multi-device capture request

import assert from "node:assert/strict";
import test from "node:test";
import {
  DYNAMIC_OPTION_NAMES,
  ensureDynamicOptionsMarkup,
} from "./form-view-dynamic-options.mjs";
import { createRunnerFormView } from "./form-view.mjs";

test("the dynamic fieldset injects once with every option field", () => {
  let markup = "";
  let injected = false;
  const form = {
    insertAdjacentHTML(_position, value) {
      markup = value;
      injected = true;
    },
    querySelector: () => (injected ? {} : null),
  };
  assert.equal(ensureDynamicOptionsMarkup(form), true);
  assert.equal(ensureDynamicOptionsMarkup(form), false);
  assert.match(markup, /data-dynamic-options hidden/);
  assert.match(markup, /<option value="45" selected>45 seconds<\/option>/);
  assert.match(markup, /<option value="5" selected>Every 5 m<\/option>/);
  assert.match(markup, /<option value="0">No marks<\/option>/);
  for (const value of ["5", "15", "30"]) {
    assert.match(markup, new RegExp(`<option value="${value}">${value} seconds`));
  }
  for (const name of DYNAMIC_OPTION_NAMES) {
    assert.match(markup, new RegExp(`name="${name}"`));
  }
  assert.match(markup, /polled alongside the device under test/);
});

test("forms without injection support are left untouched", () => {
  assert.equal(ensureDynamicOptionsMarkup(null), false);
  assert.equal(ensureDynamicOptionsMarkup({}), false);
});

test("the form view injects the options and shows them only for dynamic mode", () => {
  const nodes = new Map();
  const makeNode = () => ({ hidden: false, dataset: {}, textContent: "", value: "" });
  const optionsNode = makeNode();
  let injected = false;
  const form = {
    elements: { namedItem: () => ({ value: "" }) },
    insertAdjacentHTML() { injected = true; },
    querySelector: () => null,
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === "[data-runner-entry]") return form;
      if (selector === "[data-dynamic-options]") return injected ? optionsNode : null;
      if (!nodes.has(selector)) nodes.set(selector, makeNode());
      return nodes.get(selector);
    },
  };
  const view = createRunnerFormView(documentRef);
  assert.equal(injected, true);
  for (const name of DYNAMIC_OPTION_NAMES) {
    assert.equal(name in view.readValues(), true);
  }
  const definition = {
    meta: {
      surveyName: "Route",
      campusName: "Campus",
      route: { distanceM: 5, estimatedDurationSeconds: 10 },
      credentialRequirements: {},
    },
    route: { checkpoints: [] },
  };
  view.showDefinition(definition, { dynamic: true });
  assert.equal(optionsNode.hidden, false);
  view.showDefinition(definition);
  assert.equal(optionsNode.hidden, true);
});
