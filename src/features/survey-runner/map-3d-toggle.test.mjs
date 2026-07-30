// FEATURE:      Runner map 3D display control
// SURFACE:      Accessible toggle state and unsupported-SDK behavior
// WHY TOGETHER: DOM state must follow confirmed adapter operations exactly.
// STATE:        Fake map card, button, and map adapter
// RULES:        Unsupported methods never throw or claim a state change.
// PROVENANCE:   Runner field map display control

import assert from "node:assert/strict";
import test from "node:test";

import { mountRunnerMap3dToggle } from "./map-3d-toggle.mjs";

test("toggle injects accessible UI and follows confirmed adapter state", () => {
  const view = harness();
  const calls = [];
  const control = mountRunnerMap3dToggle(view.documentRef, {
    ready: true,
    set3dEnabled(value) { calls.push(value); return true; },
  });
  assert.match(view.markup, /role="group" aria-label="Map display controls"/);
  assert.equal(view.button.attributes.get("aria-pressed"), "true");
  assert.equal(view.button.attributes.get("aria-label"), "Turn 3D map off");
  assert.equal(view.button.listeners.click(), true);
  assert.deepEqual(calls, [false]);
  assert.equal(control.enabled, false);
  assert.equal(view.button.textContent, "3D map: off");
  assert.equal(view.button.listeners.click(), true);
  assert.deepEqual(calls, [false, true]);
});

test("ready adapter without 3D methods becomes safely unavailable", () => {
  const view = harness();
  const control = mountRunnerMap3dToggle(view.documentRef, { ready: true });
  assert.doesNotThrow(() => view.button.listeners.click());
  assert.equal(control.enabled, true);
  assert.equal(view.button.disabled, true);
  assert.equal(view.button.dataset.available, "false");
  assert.equal(view.button.attributes.get("aria-pressed"), "true");
  assert.equal(
    view.button.attributes.get("aria-label"),
    "3D map unavailable; currently on",
  );
});

test("failed disable reports the adapter's confirmed on state", () => {
  const view = harness();
  const control = mountRunnerMap3dToggle(view.documentRef, {
    ready: true,
    set3dEnabled: () => false,
    threeDEnabled: true,
  });
  assert.equal(control.toggle(), false);
  assert.equal(control.enabled, true);
  assert.equal(view.button.attributes.get("aria-pressed"), "true");
  assert.equal(view.button.textContent, "3D unavailable (on)");
});

test("a pre-launch attempt keeps the control available for the loaded map", () => {
  const view = harness();
  const adapter = { ready: false };
  const control = mountRunnerMap3dToggle(view.documentRef, adapter);
  assert.equal(control.toggle(), false);
  assert.equal(view.button.disabled, false);
  adapter.ready = true;
  adapter.set3dEnabled = () => true;
  assert.equal(control.toggle(), true);
  assert.equal(control.enabled, false);
});

function harness() {
  let button = null;
  const result = {
    get button() { return button; },
    markup: "",
  };
  const card = {
    insertAdjacentHTML(_position, markup) {
      result.markup = markup;
      button = fakeButton();
    },
  };
  result.documentRef = {
    querySelector(selector) {
      if (selector === ".map-card") return card;
      if (selector === '[data-action="toggle-3d"]') return button;
      return null;
    },
  };
  return result;
}

function fakeButton() {
  return {
    attributes: new Map([["aria-pressed", "true"]]),
    dataset: {},
    disabled: false,
    listeners: {},
    textContent: "",
    addEventListener(type, listener) { this.listeners[type] = listener; },
    getAttribute(name) { return this.attributes.get(name) ?? null; },
    setAttribute(name, value) { this.attributes.set(name, value); },
  };
}
