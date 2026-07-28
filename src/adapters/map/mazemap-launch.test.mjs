// FEATURE:      Public-first MazeMap launch lifecycle
// SURFACE:      Campus fallback, route center, container, and readiness tests
// WHY TOGETHER: Deterministic launch prerequisites prove one public map attempt.
// STATE:        Fake SDK calls and fake container dimensions
// RULES:        Catalog failure must not block a route-centered public map.
// PROVENANCE:   Scope/steps/05a_recast_player.md public-launch acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  campusForLaunch,
  createLoadedMazeMap,
  launchCenter,
  resolveLaunchContainer,
  waitForMazeMapLoad,
} from "./mazemap-launch.mjs";

test("catalog denial falls back to injected meta name and exact route center", async () => {
  const center = launchCenter({
    route: {
      legs: [{ geometry: [
        { lng: 170.1, lat: -45.9, z: 0 },
        { lng: 170.7, lat: -45.3, z: 1 },
      ] }],
    },
  });
  assert.ok(Math.abs(center[0] - 170.4) < 1e-12);
  assert.ok(Math.abs(center[1] + 45.6) < 1e-12);
  const catalog = await campusForLaunch({
    cache: new Map(),
    campusId: 777,
    campusName: "Meta Campus",
    center,
    sdk: { Data: { getCampus: async () => { throw Error("denied"); } } },
  });
  assert.equal(catalog.name, "Meta Campus");
  assert.deepEqual(catalog.center, center);
  assert.deepEqual(catalog.buildings, []);
});

test("public launch resolves an existing visible sized container", () => {
  const element = {
    isConnected: true,
    getBoundingClientRect: () => ({ width: 640, height: 360 }),
  };
  const documentRef = {
    defaultView: { getComputedStyle: () => ({ display: "block", visibility: "visible" }) },
    getElementById: id => id === "shared-map" ? element : null,
  };
  assert.equal(resolveLaunchContainer("shared-map", {
    documentRef,
    publicAttempt: true,
  }), element);
  assert.throws(
    () => resolveLaunchContainer("missing", { documentRef, publicAttempt: true }),
    /must already exist/,
  );
  element.hidden = true;
  assert.throws(
    () => resolveLaunchContainer(element, { documentRef, publicAttempt: true }),
    /visible and sized/,
  );
  assert.equal(resolveLaunchContainer(undefined), "map");
});

test("map readiness returns typed access, tile, and timeout failures", async () => {
  const accessMap = eventMap({
    error: { error: { response: { status: 403 } } },
  });
  await assert.rejects(
    waitForMazeMapLoad(accessMap, 50),
    error => error.classification === "access-denied",
  );
  const tileMap = eventMap({
    error: { error: Error("tile"), sourceId: "campus-tiles" },
  });
  await assert.rejects(
    waitForMazeMapLoad(tileMap, 50),
    error => error.classification === "tiles",
  );
  await assert.rejects(
    waitForMazeMapLoad({ on() {} }, 5),
    error => error.classification === "timeout",
  );
  await waitForMazeMapLoad(eventMap({ load: {} }), 50);
});

test("loaded-map constructor preserves a typed cause and removes failed instances", async () => {
  const cause = Error("constructor");
  await assert.rejects(
    createLoadedMazeMap({ Map: class { constructor() { throw cause; } } }, {}, 50),
    error => error.classification === "generic" && error.cause === cause,
  );
  let removed = 0;
  class FailedMap {
    on(type, listener) {
      if (type === "error") listener({ sourceId: "campus-tiles", error: Error("tile") });
    }
    remove() { removed += 1; }
  }
  await assert.rejects(
    createLoadedMazeMap({ Map: FailedMap }, {}, 50),
    error => error.classification === "tiles",
  );
  assert.equal(removed, 1);
});

function eventMap(events) {
  return {
    on(type, listener) {
      if (Object.hasOwn(events, type)) listener(events[type]);
    },
  };
}
