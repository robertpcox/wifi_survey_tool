// FEATURE:      Full-screen Report Player charts
// SURFACE:      node --test src/features/report-player/player-charts.test.mjs
// WHY TOGETHER: Error, fix-age, cursor, and seek assertions prove the two plots share one clock.
// STATE:        Fake SVG host, cursor lines, and seek callback
// RULES:        Chart interaction seeks deterministically and never changes source evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { mountPlayerCharts } from "./player-charts.mjs";

test("error and fix-age charts render poll points, move one cursor, and seek one clock", () => {
  const cursors = [fakeLine(), fakeLine()];
  const listeners = {};
  const root = {
    innerHTML: "",
    addEventListener(name, listener) { listeners[name] = listener; },
    querySelectorAll: selector => selector === "[data-chart-cursor]" ? cursors : [],
  };
  const seeks = [];
  const charts = mountPlayerCharts(root, {
    durationMs: 20_000,
    series: [
      { pollId: "poll-1", elapsedMs: 2_000, distanceM: 1.5, fixAgeSeconds: 0 },
      { pollId: "poll-2", elapsedMs: 10_000, distanceM: 7.5, fixAgeSeconds: 8 },
    ],
    onSeek: value => seeks.push(value),
  });
  assert.match(root.innerHTML, /Position error/);
  assert.match(root.innerHTML, /Fix age/);
  assert.equal((root.innerHTML.match(/data-chart-seek=/g) ?? []).length, 4);
  listeners.click({ target: { dataset: { chartSeek: "10000" } } });
  assert.deepEqual(seeks, [10_000]);
  charts.update(10_000);
  assert.equal(cursors[0].attributes.x1, cursors[1].attributes.x1);
  assert.equal(cursors[0].attributes.x1, 160);
});

function fakeLine() {
  return {
    attributes: {},
    setAttribute(key, value) { this.attributes[key] = value; },
  };
}
