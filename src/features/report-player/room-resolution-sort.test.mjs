// FEATURE:      Room outcome table sorting
// SURFACE:      node --test src/features/report-player/room-resolution-sort.test.mjs
// WHY TOGETHER: Numeric, text, direction, accessibility, and rebinding form one contract.
// STATE:        Small in-memory table fixture
// RULES:        Each rendered button receives one listener and updates aria-sort.
// PROVENANCE:   Consolidated MazeMap room report

import assert from "node:assert/strict";
import test from "node:test";

import {
  bindRoomResolutionSort, compareRoomRows,
} from "./room-resolution-sort.mjs";

test("row comparison sorts numeric values numerically and room numbers naturally", () => {
  const two = row({ roomVisits: "2", roomNumber: "K2" });
  const ten = row({ roomVisits: "10", roomNumber: "K10" });
  assert.ok(compareRoomRows(two, ten, "visits") < 0);
  assert.ok(compareRoomRows(two, ten, "number") < 0);
  assert.ok(compareRoomRows(two, ten, "visits", "descending") > 0);
});

test("binding is idempotent and a sort updates aria state and row order", () => {
  const rows = [row({ roomVisits: "2" }), row({ roomVisits: "10" })];
  const headers = [header("ascending"), header("none")];
  const body = {
    rows,
    append(value) {
      const index = rows.indexOf(value);
      rows.splice(index, 1);
      rows.push(value);
    },
  };
  const table = {
    querySelectorAll: () => headers,
    querySelector: () => body,
  };
  const button = {
    dataset: { roomSort: "visits" }, calls: 0,
    addEventListener(_type, listener) { this.calls += 1; this.click = listener; },
    closest(selector) { return selector === "table" ? table : headers[1]; },
  };
  const root = { querySelectorAll: () => [button] };
  bindRoomResolutionSort(root);
  bindRoomResolutionSort(root);
  assert.equal(button.calls, 1);
  button.click();
  assert.deepEqual(headers.map(item => item.getAttribute("aria-sort")), ["none", "ascending"]);
  assert.deepEqual(rows.map(item => item.dataset.roomVisits), ["2", "10"]);
  button.click();
  assert.deepEqual(rows.map(item => item.dataset.roomVisits), ["10", "2"]);
});

function row(dataset) {
  return { dataset };
}

function header(initial) {
  const attributes = new Map([["aria-sort", initial]]);
  return {
    getAttribute: key => attributes.get(key),
    setAttribute: (key, value) => attributes.set(key, value),
  };
}
