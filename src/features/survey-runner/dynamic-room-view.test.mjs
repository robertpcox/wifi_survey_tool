// FEATURE:      Dynamic room Runner view tests
// SURFACE:      Injected selectors, lifecycle rendering, and intent bindings
// WHY TOGETHER: The DOM contract is the integration boundary for the dynamic controller.
// STATE:        Fake injected panel across every supported capture phase
// RULES:        Hidden actions are disabled and the view never handles map or polling events.
// PROVENANCE:   Ad-hoc room survey field workflow

import assert from "node:assert/strict";
import test from "node:test";
import {
  createDynamicRoomView,
  DYNAMIC_ROOM_SELECTORS,
  dynamicRoomAcceptsPoint,
} from "./dynamic-room-view.mjs";

const HUD_SELECTORS = [
  "[data-run-progress]", "[data-current-target]",
  "[data-current-floor]", "[data-dwell-countdown]",
];

function harness() {
  let injected = false;
  let markup = "";
  let insertions = 0;
  const makeNode = () => ({
    addEventListener(type, handler) { this.listeners[type] = handler; },
    setAttribute(name, value) { this.attributes[name] = value; },
    attributes: {},
    dataset: {},
    disabled: false,
    hidden: true,
    listeners: {},
    textContent: "",
  });
  const nodes = new Map(
    [...Object.values(DYNAMIC_ROOM_SELECTORS), ...HUD_SELECTORS]
      .map(selector => [selector, makeNode()]),
  );
  const root = makeNode();
  root.insertAdjacentHTML = (_position, value) => {
    insertions += 1;
    markup = value;
    injected = true;
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === "[data-run-panel]") return root;
      return injected ? nodes.get(selector) ?? null : null;
    },
  };
  const view = createDynamicRoomView(documentRef);
  return { documentRef, insertions: () => insertions, markup: () => markup, nodes, root, view };
}

test("injects one panel without any bespoke walking buttons", () => {
  const state = harness();
  createDynamicRoomView(state.documentRef);
  assert.equal(state.insertions(), 1);
  assert.match(state.markup(), /data-dynamic-room-panel/);
  assert.match(state.markup(), /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(state.markup(), /data-action="dynamic-continue-dwell" hidden>Continue/);
  assert.match(state.markup(), /data-action="dynamic-extend-dwell" hidden>\+10 seconds/);
  assert.match(state.markup(), /data-action="dynamic-finish" hidden>Finish survey/);
  assert.match(state.markup(), /data-action="dynamic-retry" hidden>Retry route finalisation/);
  assert.match(state.markup(), /data-action="dynamic-clear">Clear capture/);
  assert.doesNotMatch(
    state.markup(),
    /dynamic-check-in|dynamic-dwell"|dynamic-pass-mark|dynamic-skip-mark/,
  );
  assert.equal(Object.isFrozen(DYNAMIC_ROOM_SELECTORS), true);
});

test("renders phases through the shared planned HUD", () => {
  const { nodes, root, view } = harness();
  const get = key => nodes.get(DYNAMIC_ROOM_SELECTORS[key]);
  const hud = selector => nodes.get(selector);
  view.render({ phase: "tap-point", hud: {
    progress: "0 checked in", target: "Tap the map", floor: "—", checkInEnabled: false,
  } });
  assert.match(get("status").textContent, /first checkpoint/);
  assert.equal(view.acceptsMapPoint(), true);
  assert.equal(root.dataset.dynamicRoomActive, "true");
  assert.equal(hud("[data-current-target]").textContent, "Tap the map");
  assert.equal(get("checkIn").disabled, true);
  view.render({ phase: "pending", hud: {
    progress: "checkpoint 2", target: "Room B", floor: "Level 1", checkInEnabled: true,
  } });
  assert.equal(get("checkIn").disabled, false);
  assert.equal(hud("[data-current-target]").textContent, "Room B");
  assert.equal(hud("[data-dwell-countdown]").textContent, "Ready to check in");
  assert.equal(get("continueDwell").hidden, true);
  view.render({
    phase: "dwelling",
    dwellRemainingSeconds: 4.2,
    hud: { progress: "checkpoint 1", target: "Room A", floor: "z1", checkInEnabled: false },
  });
  assert.equal(hud("[data-dwell-countdown]").textContent, "5 s dwell");
  assert.equal(get("continueDwell").hidden, false);
  assert.equal(get("continueDwell").disabled, false);
  assert.equal(get("extendDwell").hidden, false);
  assert.equal(get("finish").disabled, false);
  view.render({ phase: "finalising", error: "Route service unavailable.", retryAvailable: true });
  assert.match(get("status").textContent, /Route service unavailable.*Polling continues/);
  assert.equal(get("retry").hidden, false);
  get("stopDialog").hidden = false;
  view.render({ phase: "completed", exportReady: true });
  assert.match(get("status").textContent, /ready to download/);
  assert.equal(get("exports").hidden, false);
  assert.equal(get("stop").hidden, true);
  assert.equal(get("stopDialog").hidden, true);
  view.hide();
  assert.equal(get("panel").hidden, true);
  assert.equal(root.dataset.dynamicRoomActive, "false");
  assert.equal(get("skip").hidden, false);
  assert.equal(get("checkIn").disabled, false);
});

test("bind emits panel intent only; check-in and skip stay shared bindings", () => {
  const { nodes, view } = harness();
  const calls = [];
  view.bind({
    continueDwell: () => calls.push("continue"),
    extendDwell: () => calls.push("extend"),
    finish: () => calls.push("finish"),
    retry: () => calls.push("retry"),
    downloadDefinition: () => calls.push("definition"),
    downloadResult: () => calls.push("result"),
    clear: () => calls.push("clear"),
  });
  for (const key of [
    "continueDwell", "extendDwell", "finish", "retry",
    "downloadDefinition", "downloadResult", "clear",
  ]) {
    nodes.get(DYNAMIC_ROOM_SELECTORS[key]).listeners.click();
  }
  assert.deepEqual(
    calls,
    ["continue", "extend", "finish", "retry", "definition", "result", "clear"],
  );
  assert.deepEqual(nodes.get(DYNAMIC_ROOM_SELECTORS.checkIn).listeners, {});
  assert.deepEqual(nodes.get(DYNAMIC_ROOM_SELECTORS.skip).listeners, {});
  assert.equal(dynamicRoomAcceptsPoint("walking"), true);
  assert.equal(dynamicRoomAcceptsPoint("dwelling"), true);
  assert.equal(dynamicRoomAcceptsPoint("pending"), false);
  assert.throws(() => view.render({ phase: "unknown" }), /Unknown dynamic room phase/);
});
