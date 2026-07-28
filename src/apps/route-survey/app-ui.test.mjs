import assert from "node:assert/strict";
import test from "node:test";

import { createAppUi } from "./app-ui.mjs";

function uiHarness() {
  const ids = ["statusText"];
  for (const tab of ["route", "log", "live", "play"]) {
    ids.push(`tab-${tab}`, `tabbtn-${tab}`);
  }
  const elements = Object.fromEntries(ids.map(id => {
    const classes = new Set();
    return [
      id,
      {
        classes,
        style: {},
        textContent: "",
        classList: {
          toggle: (name, enabled) => {
            if (enabled) classes.add(name);
            else classes.delete(name);
          },
        },
      },
    ];
  }));
  const configListeners = {};
  const windowListeners = {};
  const documentRef = {
    getElementById: id => elements[id],
    querySelector: () => ({
      addEventListener: (name, callback) => {
        configListeners[name] = callback;
      },
    }),
  };
  const windowRef = {
    addEventListener: (name, callback) => {
      windowListeners[name] = callback;
    },
  };
  return {
    configListeners,
    elements,
    ui: createAppUi(documentRef, windowRef),
    windowListeners,
    windowRef,
  };
}

test("setStatus renders normal and error status text", () => {
  const { elements, ui } = uiHarness();
  ui.setStatus("", "Ready");
  assert.equal(elements.statusText.textContent, "Ready");
  assert.equal(elements.statusText.style.color, "#667085");
  ui.setStatus("err", "Failed");
  assert.equal(elements.statusText.textContent, "Failed");
  assert.equal(elements.statusText.style.color, "#d92d20");
});

test("showTab activates only the requested tab and button", () => {
  const { elements, ui } = uiHarness();
  ui.showTab("live");
  for (const tab of ["route", "log", "live", "play"]) {
    assert.equal(elements[`tab-${tab}`].classes.has("active"), tab === "live");
    assert.equal(
      elements[`tabbtn-${tab}`].classes.has("active"),
      tab === "live",
    );
  }
});

test("bindActions publishes action groups and the tab action", () => {
  const { ui, windowRef } = uiHarness();
  const first = () => "first";
  const second = () => "second";
  ui.bindActions({ first }, { second });
  assert.equal(windowRef.first, first);
  assert.equal(windowRef.second, second);
  assert.equal(windowRef.showTab, ui.showTab);
});

test("wireMapResize binds configuration and window resize events", () => {
  const harness = uiHarness();
  const resizeMapSoon = () => {};
  harness.ui.wireMapResize({ resizeMapSoon });
  assert.equal(harness.configListeners.toggle, resizeMapSoon);
  assert.equal(harness.windowListeners.resize, resizeMapSoon);
});
