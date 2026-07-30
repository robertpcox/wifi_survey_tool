// FEATURE:      Dynamic room mark view tests
// SURFACE:      Mark button visibility, labels, staged status copy, and bindings
// WHY TOGETHER: The mark tap target is the walking surveyor's primary control.
// STATE:        Fake injected panel driven through mark-bearing phases
// RULES:        Mark actions never show outside a pending target with remaining marks.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import test from "node:test";
import {
  createDynamicRoomView,
  DYNAMIC_ROOM_SELECTORS,
  dynamicRoomAcceptsPoint,
} from "./dynamic-room-view.mjs";
import {
  dynamicRoomMarkLabel,
  dynamicRoomStatusText,
} from "./dynamic-room-view-markup.mjs";

function harness() {
  let injected = false;
  let markup = "";
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
    markup = value;
    injected = true;
  };
  const documentRef = {
    querySelector(selector) {
      if (selector === "[data-run-panel]") return root;
      return injected ? nodes.get(selector) ?? null : null;
    },
  };
  return { markup: () => markup, nodes, view: createDynamicRoomView(documentRef) };
}

test("mark buttons inject, label progress, and only show with remaining marks", () => {
  const { markup, nodes, view } = harness();
  const get = key => nodes.get(DYNAMIC_ROOM_SELECTORS[key]);
  assert.match(markup(), /data-action="dynamic-pass-mark" hidden>Passed mark/);
  assert.match(markup(), /data-action="dynamic-skip-mark" hidden>Skip missed mark/);
  view.render({ phase: "pending", marks: { consumed: 1, total: 4, remaining: 3 } });
  assert.equal(get("passMark").hidden, false);
  assert.equal(get("passMark").textContent, "Passed mark 2 of 4");
  assert.equal(get("skipMark").hidden, false);
  assert.equal(get("checkIn").hidden, false);
  view.render({ phase: "pending", marks: { consumed: 4, total: 4, remaining: 0 } });
  assert.equal(get("passMark").hidden, true);
  view.render({ phase: "pending" });
  assert.equal(get("passMark").hidden, true);
  view.render({ phase: "dwelling", marks: { consumed: 0, total: 2, remaining: 2 } });
  assert.equal(get("passMark").hidden, true);
});

test("staged and mark phases surface distinct guidance", () => {
  assert.equal(dynamicRoomMarkLabel({ consumed: 0, total: 2 }), "Passed mark 1 of 2");
  assert.match(dynamicRoomStatusText({ phase: "dwelling" }), /stage the next checkpoint/);
  assert.match(dynamicRoomStatusText({ phase: "dwelling", staged: true }), /staged/);
  assert.match(
    dynamicRoomStatusText({ phase: "pending", marks: { remaining: 2 } }),
    /tap each mark as you pass it/,
  );
  assert.match(dynamicRoomStatusText({ phase: "pending" }), /Choose a check-in/);
  assert.equal(dynamicRoomAcceptsPoint("dwelling"), true);
});

test("mark intents bind alongside the existing capture actions", () => {
  const { nodes, view } = harness();
  const calls = [];
  view.bind({
    passMark: () => calls.push("pass"),
    skipMark: () => calls.push("skip"),
  });
  nodes.get(DYNAMIC_ROOM_SELECTORS.passMark).listeners.click();
  nodes.get(DYNAMIC_ROOM_SELECTORS.skipMark).listeners.click();
  assert.deepEqual(calls, ["pass", "skip"]);
});
