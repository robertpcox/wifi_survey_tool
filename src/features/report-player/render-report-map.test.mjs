// FEATURE:      Report map repaint lifecycle
// SURFACE:      node --test src/features/report-player/render-report-map.test.mjs
// WHY TOGETHER: Busy wrapper, draw, and layout completion prove one repaint boundary.
// STATE:        Deferred fake layout work
// RULES:        Rendering remains pending until the MazeMap layout has settled.
// PROVENANCE:   Consolidated report rendering feedback

import assert from "node:assert/strict";
import test from "node:test";

import { renderReportMap } from "./render-report-map.mjs";

test("report repaint keeps its busy work open through map layout settle", async () => {
  const events = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const surface = {
    mapMode: "mazemap",
    render: update => events.push(["render", update]),
    settleLayout: async () => { events.push(["settle"]); await gate; },
    withRendering: async (message, work) => {
      events.push(["busy", message]);
      const result = await work();
      events.push(["idle"]);
      return result;
    },
  };
  const repaint = renderReportMap(surface, { heatKind: "room" });
  await Promise.resolve();
  assert.deepEqual(events.slice(0, 3), [
    ["busy", "Rendering consolidated map…"],
    ["render", { heatKind: "room" }],
    ["settle"],
  ]);
  assert.equal(events.some(event => event[0] === "idle"), false);
  release();
  await repaint;
  assert.deepEqual(events.at(-1), ["idle"]);
});
