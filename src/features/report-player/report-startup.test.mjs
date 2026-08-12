// FEATURE:      Report Player ordered startup
// SURFACE:      node --test src/features/report-player/report-startup.test.mjs
// WHY TOGETHER: Initial access and later private retries share one room-resolution boundary.
// STATE:        Deferred map, run-fetch, map-fit, and room promises
// RULES:        Map ready < non-seed fetch < overview fit complete < room resolution.
// PROVENANCE:   Consolidated report blank-map fault finding

import assert from "node:assert/strict";
import test from "node:test";

import { createReportStartup } from "./report-startup.mjs";

test("consolidated startup waits for map, overview fetch, and fit before rooms", async () => {
  const events = [];
  const map = deferred();
  const runs = deferred();
  const fit = deferred();
  const surface = { mapMode: "launching" };
  const access = {
    accessReady: true,
    async start() {
      events.push("map:start");
      await map.promise;
      surface.mapMode = "mazemap";
      events.push("map:ready");
      return { status: "ready" };
    },
  };
  const player = {
    async prepareOverview() {
      events.push("runs:fetch");
      await runs.promise;
      events.push("overview:render");
      await fit.promise;
      events.push("overview:fit");
      return true;
    },
    enableRoomLookup() { events.push("rooms:resolve"); return true; },
    markRoomUnavailable() { events.push("rooms:unavailable"); return false; },
  };
  const startup = createReportStartup({
    access, player, surface, initialView: "overview",
    requirePrivateAccess: true,
  });
  const ready = startup.start();
  assert.deepEqual(events, ["map:start"]);
  assert.equal(startup.onAccessReady(), true);
  map.resolve();
  await tick();
  assert.deepEqual(events, ["map:start", "map:ready", "runs:fetch"]);
  runs.resolve();
  await tick();
  assert.equal(events.includes("rooms:resolve"), false);
  fit.resolve();
  await ready.roomReady;
  assert.deepEqual(events, [
    "map:start", "map:ready", "runs:fetch", "overview:render",
    "overview:fit", "rooms:resolve",
  ]);
});

test("a private retry after fallback reruns room lookup", async () => {
  const events = [];
  let privateReady = false;
  const access = {
    get accessReady() { return privateReady; },
    async start() { events.push("map:ready"); return { status: "ready" }; },
  };
  const player = {
    prepareOverview: async () => { events.push("overview:fit"); },
    enableRoomLookup: async () => { events.push("rooms:resolve"); },
    markRoomUnavailable: async () => { events.push("rooms:unavailable"); },
  };
  const startup = createReportStartup({
    access, player, surface: { mapMode: "mazemap" },
    initialView: "overview", requirePrivateAccess: true,
  });
  await startup.start().roomReady;
  privateReady = true;
  await startup.onAccessReady();
  assert.deepEqual(events, [
    "map:ready", "overview:fit", "rooms:unavailable", "rooms:resolve",
  ]);
});

function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}

function tick() {
  return new Promise(resolve => setImmediate(resolve));
}
