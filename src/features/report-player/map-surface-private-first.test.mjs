// FEATURE:      Report Player private-first MazeMap launch
// SURFACE:      node --test src/features/report-player/map-surface-private-first.test.mjs
// WHY TOGETHER: Required access and the first adapter launch form one credential boundary.
// STATE:        Fake adapter and inert map elements
// RULES:        A token-first retry must never perform an earlier public launch.
// PROVENANCE:   Consolidated and dynamic-room area-resolution access

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReportMapSurface } from "./map-surface.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("private access can be the first launch without touching public MazeMap", async () => {
  const launches = [];
  const surface = createReportMapSurface({
    result,
    ...mapElements(),
    createMap: () => adapter(launches),
    ResizeObserverRef: null,
  });
  const outcome = await surface.retryAccess("private-first");
  assert.equal(outcome.status, "ready");
  assert.deepEqual(launches, [{ access: "private-first", zLevel: 0 }]);
  assert.equal(surface.mapMode, "mazemap");
});

function adapter(launches) {
  return {
    launch: async (token, _click, runtime) => {
      launches.push({ access: token, zLevel: runtime.zLevel }); return 1;
    },
    drawRoute() {}, drawStops() {}, drawWaypoints() {}, drawReportHeat() {},
    fitRoute() {}, resizeMapSoon() {}, setMapZLevel() {}, setViewMode() {},
    getMapZLevel: () => 1,
    startZWatch: () => () => {},
  };
}

function mapElements() {
  const context = new Proxy({}, { get: () => () => {}, set: () => true });
  return {
    canvas: { getContext: () => context, width: 900, height: 460 },
    mapElement: { hidden: false, parentElement: {} },
    fallbackElement: { hidden: true },
    statusElement: { textContent: "" },
  };
}
