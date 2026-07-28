import assert from "node:assert/strict";
import test from "node:test";

import { mountAppShell } from "./shell-boot.mjs";

function element(value = "") {
  return {
    value,
    addEventListener(name, callback) {
      this[name] = callback;
    },
  };
}

test("shell boot reports readiness and keeps submitted access in memory", () => {
  const nodes = {
    "[data-shell-status]": element(),
    "[data-map-access]": element("runtime-access"),
    "[data-save-access]": element(),
    "[data-clear-access]": element(),
  };
  const values = new Map();
  const credentials = {
    set: (name, value) => values.set(name, value),
    has: name => values.has(name),
    clear: name => values.delete(name),
  };
  mountAppShell({
    appName: "Creator",
    credentials,
    documentRef: { querySelector: selector => nodes[selector] || null },
  });
  assert.equal(nodes["[data-shell-status]"].textContent, "Creator shell ready.");
  nodes["[data-save-access]"].click();
  assert.equal(nodes["[data-map-access]"].value, "");
  assert.equal(values.has("mapAccess"), true);
  assert.match(nodes["[data-shell-status]"].textContent, /held in memory/);
  nodes["[data-clear-access]"].click();
  assert.equal(values.has("mapAccess"), false);
});
