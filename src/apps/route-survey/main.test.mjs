import assert from "node:assert/strict";
import test from "node:test";

import { bootRouteSurvey } from "./main.mjs";

function fakeElement() {
  const listeners = {};
  const classes = new Set();
  return {
    checked: false,
    className: "",
    disabled: false,
    hidden: false,
    innerHTML: "",
    listeners,
    style: {},
    textContent: "",
    value: "",
    addEventListener: (name, callback) => {
      listeners[name] = callback;
    },
    classList: {
      add: name => classes.add(name),
      toggle: (name, enabled) => {
        if (enabled) classes.add(name);
        else classes.delete(name);
      },
    },
  };
}

function bootHarness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, fakeElement());
    return elements.get(id);
  };
  const config = fakeElement();
  const documentRef = {
    defaultView: {
      matchMedia: () => ({ matches: false }),
    },
    getElementById: element,
    querySelector: () => config,
  };
  const stored = new Map([
    ["routeSurvey.v1.appId", "stored-id"],
    ["routeSurvey.v1.appKey", "stored-key"],
    ["routeSurvey.v1.mapAccess", "stored-map-access"],
    ["routeSurvey.v1.configId", "stored-config"],
  ]);
  const removed = [];
  const storage = {
    getItem: key => stored.get(key) ?? null,
    removeItem: key => {
      removed.push(key);
      stored.delete(key);
    },
    setItem: (key, value) => stored.set(key, value),
  };
  const windowListeners = {};
  const windowRef = {
    addEventListener: (name, callback) => {
      windowListeners[name] = callback;
    },
  };
  const fetchImpl = async () => ({
    ok: true,
    json: async () => [],
  });
  return {
    config,
    documentRef,
    element,
    fetchImpl,
    removed,
    storage,
    stored,
    windowListeners,
    windowRef,
  };
}

test("bootRouteSurvey composes the app and removes stored credentials", async () => {
  const harness = bootHarness();
  const app = await bootRouteSurvey({
    documentRef: harness.documentRef,
    windowRef: harness.windowRef,
    storage: harness.storage,
    fetchImpl: harness.fetchImpl,
  });
  assert.deepEqual(harness.removed, [
    "routeSurvey.v1.appId",
    "routeSurvey.v1.appKey",
    "routeSurvey.v1.mapAccess",
  ]);
  assert.equal(harness.element("configId").value, "stored-config");
  assert.equal(
    harness.element("statusText").textContent,
    "Enter map access, then launch the map.",
  );
  assert.equal(typeof harness.windowRef.addStopFromInput, "function");
  assert.equal(typeof harness.windowRef.walkMainAction, "function");
  assert.equal(typeof harness.windowRef.launchMap, "function");
  assert.equal(typeof harness.windowRef.showTab, "function");
  assert.deepEqual(app.routeState.stops, []);
  assert.deepEqual(app.sessionState.samples, []);
  assert.equal(harness.config.listeners.toggle, app.mapAdapter.resizeMapSoon);
  assert.equal(harness.windowListeners.resize, app.mapAdapter.resizeMapSoon);
});

test("launchMap validates access and clears it when MazeMap is absent", async () => {
  const harness = bootHarness();
  await bootRouteSurvey({
    documentRef: harness.documentRef,
    windowRef: harness.windowRef,
    storage: harness.storage,
    fetchImpl: harness.fetchImpl,
  });
  await harness.windowRef.launchMap();
  assert.equal(
    harness.element("statusText").textContent,
    "Enter map access before launching the map",
  );

  harness.element("mapAccess").value = "memory-only-access";
  await harness.windowRef.launchMap();
  assert.equal(harness.element("mapAccess").value, "");
  assert.equal(
    harness.element("statusText").textContent,
    "MazeMap failed to load",
  );
  assert.equal(harness.stored.has("routeSurvey.v1.mapAccess"), false);
});
