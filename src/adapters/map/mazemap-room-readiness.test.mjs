// FEATURE:      Authenticated MazeMap room-catalogue readiness
// SURFACE:      node --test src/adapters/map/mazemap-room-readiness.test.mjs
// WHY TOGETHER: Provider campus layers and rendered frames form one local-POI boundary.
// STATE:        Deferred campus readiness and one tokened map
// RULES:        Building discovery cannot run before the provider campus is loaded.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapRoomReadiness } from "./mazemap-room-readiness.mjs";

test("room data waits for the authenticated provider campus layers", async () => {
  let releaseCampus;
  let settled = false;
  const campusReady = new Promise(resolve => { releaseCampus = resolve; });
  const map = {
    campuses: { onceWhenLoaded: () => campusReady },
    isMoving: () => false,
  };
  const readiness = createMazeMapRoomReadiness({
    scheduleFrame: callback => queueMicrotask(callback),
  });
  readiness.begin("private-token");
  readiness.loaded(map);
  const work = readiness.wait().then(() => { settled = true; });
  await Promise.resolve();
  assert.equal(settled, false);
  releaseCampus();
  await work;
  assert.equal(settled, true);
});

test("public or incomplete maps cannot start room queries", async () => {
  const readiness = createMazeMapRoomReadiness();
  readiness.begin(null);
  readiness.loaded({});
  await assert.rejects(readiness.wait(), /loaded authenticated map/);
});
