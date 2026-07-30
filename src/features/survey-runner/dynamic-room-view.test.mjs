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
  const nodes = new Map(Object.values(DYNAMIC_ROOM_SELECTORS)
    .map(selector => [selector, makeNode()]));
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

test("injects one accessible panel with stable integration selectors", () => {
  const state = harness();
  createDynamicRoomView(state.documentRef);
  assert.equal(state.insertions(), 1);
  assert.match(state.markup(), /data-dynamic-room-panel/);
  assert.match(state.markup(), /role="status" aria-live="polite" aria-atomic="true"/);
  assert.match(state.markup(), /data-action="dynamic-check-in">Check in &amp; keep walking/);
  assert.match(state.markup(), /data-action="dynamic-dwell">Dwell here for 5s/);
  assert.match(state.markup(), /data-action="dynamic-extend-dwell" hidden>\+10 seconds/);
  assert.match(state.markup(), /data-action="dynamic-finish" hidden>Finish survey/);
  assert.match(state.markup(), /data-action="dynamic-retry" hidden>Retry route finalisation/);
  assert.match(state.markup(), /data-action="dynamic-download-definition"/);
  assert.match(state.markup(), /data-action="dynamic-download-result"/);
  assert.match(state.markup(), /data-action="dynamic-clear">Clear capture/);
  assert.equal(Object.isFrozen(DYNAMIC_ROOM_SELECTORS), true);
});

test("renders point, pending, dwell, finalising, and export-ready phases", () => {
  const { nodes, root, view } = harness();
  const get = key => nodes.get(DYNAMIC_ROOM_SELECTORS[key]);
  view.render({ phase: "tap-point" });
  assert.match(get("status").textContent, /first checkpoint/);
  assert.equal(view.acceptsMapPoint(), true);
  assert.equal(root.hidden, false);
  assert.equal(get("clear").hidden, true);
  assert.equal(root.dataset.dynamicRoomActive, "true");
  assert.equal(get("stop").hidden, false);
  view.render({ phase: "pending" });
  assert.equal(get("checkIn").hidden, false);
  assert.equal(get("checkIn").disabled, false);
  assert.equal(get("dwell").hidden, false);
  assert.equal(get("finish").hidden, true);
  view.render({ phase: "walking", canFinish: false });
  assert.match(get("status").textContent, /next checkpoint/);
  assert.equal(view.acceptsMapPoint(), true);
  assert.equal(get("finish").hidden, false);
  assert.equal(get("finish").disabled, true);
  view.render({
    phase: "finalising",
    error: "Route service unavailable.",
    retryAvailable: true,
  });
  assert.match(get("status").textContent, /Route service unavailable.*Polling continues/);
  assert.equal(get("retry").hidden, false);
  assert.equal(get("retry").disabled, false);
  view.render({ phase: "dwelling", dwellRemainingSeconds: 4.2 });
  assert.equal(get("dwellRemaining").textContent, "5 seconds remaining");
  assert.equal(get("extendDwell").hidden, false);
  assert.equal(get("extendDwell").disabled, false);
  assert.equal(get("finish").disabled, false);
  view.render({ phase: "finalising" });
  assert.equal(
    get("status").textContent,
    "Finalising route — remain at the final checkpoint. Polling continues.",
  );
  assert.equal(get("panel").attributes["aria-busy"], "true");
  assert.equal(get("finish").disabled, true);
  assert.equal(get("retry").hidden, true);
  get("stopDialog").hidden = false;
  view.render({ phase: "completed", exportReady: true });
  assert.match(get("status").textContent, /ready to download/);
  assert.equal(get("exports").hidden, false);
  assert.equal(get("downloadDefinition").disabled, false);
  assert.equal(get("downloadResult").disabled, false);
  assert.equal(get("clear").disabled, false);
  assert.equal(get("stop").hidden, true);
  assert.equal(get("stopDialog").hidden, true);
  view.hide();
  assert.equal(get("panel").hidden, true);
  assert.equal(root.dataset.dynamicRoomActive, "false");
});

test("bind emits capture intent without owning map, polling, routing, or export", () => {
  const { nodes, view } = harness();
  const calls = [];
  const handlers = {
    checkIn: () => calls.push("check-in"),
    dwell: () => calls.push("dwell"),
    extendDwell: () => calls.push("extend"),
    finish: () => calls.push("finish"),
    retry: () => calls.push("retry"),
    downloadDefinition: () => calls.push("definition"),
    downloadResult: () => calls.push("result"),
    clear: () => calls.push("clear"),
  };
  view.bind(handlers);
  for (const key of [
    "checkIn", "dwell", "extendDwell", "finish", "retry",
    "downloadDefinition", "downloadResult", "clear",
  ]) {
    nodes.get(DYNAMIC_ROOM_SELECTORS[key]).listeners.click();
  }
  assert.deepEqual(
    calls,
    ["check-in", "dwell", "extend", "finish", "retry", "definition", "result", "clear"],
  );
  assert.equal("mapClick" in handlers, false);
  assert.equal(dynamicRoomAcceptsPoint("walking"), true);
  assert.equal(dynamicRoomAcceptsPoint("pending"), false);
  assert.throws(() => view.render({ phase: "unknown" }), /Unknown dynamic room phase/);
});
