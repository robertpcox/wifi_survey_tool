// FEATURE:      Report Player shared map surface
// SURFACE:      node --test src/features/report-player/map-surface.test.mjs
// WHY TOGETHER: Public decline and private enhancement assertions prove one map lifecycle.
// STATE:        Fake canvas operations and private adapter calls
// RULES:        The supplied token is observed only at the injected launch call.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReportMapSurface } from "./map-surface.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("declining private access keeps public route map and private mode draws overlays", async () => {
  const publicElement = { hidden: false };
  const privateElement = { hidden: true };
  const calls = [];
  const adapter = {
    launch: async token => calls.push(["launch", token]),
    drawRoute: value => calls.push(["route", value.length]),
    drawStops: value => calls.push(["stops", value.length]),
    drawWaypoints: value => calls.push(["waypoints", value.length]),
    drawPositionTrail() {},
    fitRoute: () => true,
    setMapZLevel() {},
  };
  const surface = createReportMapSurface({
    result,
    publicElement,
    privateElement,
    canvas: fakeCanvas(),
    createPrivateMap: () => adapter,
  });
  assert.equal(surface.mode, "public");
  assert.equal(publicElement.hidden, false);
  await surface.usePrivate("typed-at-runtime");
  assert.deepEqual(calls[0], ["launch", "typed-at-runtime"]);
  assert.equal(surface.mode, "private");
  assert.equal(surface.usePublic(), "public");
  assert.equal(publicElement.hidden, false);
});

function fakeCanvas() {
  const context = new Proxy({}, {
    get(target, key) {
      if (!(key in target)) target[key] = () => {};
      return target[key];
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { width: 900, height: 460, getContext: () => context };
}
