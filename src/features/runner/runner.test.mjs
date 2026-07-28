import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createRunner } from "./runner.mjs";

function makeDocument() {
  const ids = [
    "appId", "appKey", "clientIp", "cloudBase", "cntCheckin", "cntCloud",
    "cntLipi", "configId", "dotCloud", "dotLipi", "lipiUrl", "logList",
    "pollInterval", "routeName", "srcCloud", "srcLipi", "walkBtn",
    "walkDist", "walkPrompt", "walkSecondary", "walkTarget", "wpSpacing",
  ];
  const elements = Object.fromEntries(ids.map(id => {
    const node = {
      checked: false, className: "", disabled: false, innerHTML: "",
      style: {}, textContent: "", value: "",
    };
    node.classList = { add: name => { node.className += ` ${name}`; } };
    return [id, node];
  }));
  const values = {
    clientIp: "192.0.2.1", cloudBase: "/proxy", configId: "cfg", lipiUrl: "/lipi",
    pollInterval: "1000", routeName: "Route A", wpSpacing: "10",
  };
  for (const [id, value] of Object.entries(values)) elements[id].value = value;
  return {
    elements,
    getElementById: id => elements[id],
    location: { href: "https://survey.invalid/tool/" },
  };
}

test("createRunner composes exports, resets, actions, blocking, and Runner CSS", async () => {
  const documentRef = makeDocument();
  const routeState = {
    buildVersion: 0,
    legs: [{ coords: [], fromIdx: 0, toIdx: 1 }],
    loadBusy: false,
    selectionVersion: 1,
    stops: [
      { label: "A", lat: -36.85, lng: 174.76, targetType: "point", z: 1 },
      { label: "B", lat: -36.851, lng: 174.761, targetType: "point", z: 1 },
    ],
    waypoints: [{
      id: 0, kind: "stop", lat: -36.85, legIdx: 0, lng: 174.76,
      name: "A", seq: 0, state: "current", stopIdx: 0, z: 1,
    }],
  };
  const sessionState = {
    events: [{
      iso: "2026-07-28T00:00:00.000Z", note: "existing",
      tMs: 1_775_000_000_000, type: "walk_start",
    }],
    meta: { endedAt: null, routeName: "Route A",
      startedAt: "2026-07-28T00:00:00.000Z" },
    pollRun: { cloud: false, lipi: false },
    sampleCounts: { cloud: 1, lipi: 0 },
    sampleSeq: 1,
    samples: [{
      data: { latitude: -36.85, longitude: 174.76, zLevel: 1 },
      http: 200,
      isoRecv: "2026-07-28T00:00:00.010Z",
      isoSent: "2026-07-28T00:00:00.000Z",
      ok: true,
      rttMs: 10,
      source: "cloud",
      tRecvMs: 1_775_000_000_010,
      tSentMs: 1_775_000_000_000,
    }],
    walk: { history: [], phase: "walking", wpIdx: 0 },
  };
  const downloads = [];
  const mapCalls = [];
  const statuses = [];
  const runner = createRunner({
    clearIntervalImpl() {},
    documentRef,
    downloadFile: (...args) => downloads.push(args),
    fetchImpl: async () => { throw new Error("unexpected network"); },
    mapAdapter: {
      clearTargetMarker: () => mapCalls.push("clear"),
      drawTrails: value => mapCalls.push(["trails", value]),
      drawWaypoints: value => mapCalls.push(["waypoints", value]),
      setActiveLeg: value => mapCalls.push(["active", value]),
    },
    nowDate: () => new Date("2026-07-28T00:00:00.000Z"),
    nowMs: () => 1_775_000_000_000,
    routeState,
    sessionState,
    setIntervalImpl: () => 1,
    setStatus: (...args) => statuses.push(args),
    sleep: async () => { throw new Error("unexpected sleep"); },
    vibrate() {},
  });
  assert.deepEqual(Object.keys(runner.actions), [
    "clearSession", "endWalk", "exportSessionCsv", "exportSessionJson",
    "importSession", "exitPlayback", "pbSeek", "pbTogglePlay",
    "skipWaypoint", "startPolling", "stopPolling", "undoCheckin",
    "walkMainAction",
  ]);
  assert.equal(runner.isRouteEditingBlocked(), true);
  runner.initialize();
  assert.match(documentRef.elements.logList.innerHTML, /walk_start/);
  runner.routeBuilt();
  assert.equal(sessionState.walk.phase, "idle");
  assert.equal(runner.isRouteEditingBlocked(), false);
  sessionState.walk.phase = "walking";
  runner.routeInvalidated();
  assert.equal(sessionState.walk.phase, "idle");
  runner.actions.exportSessionJson();
  runner.actions.exportSessionCsv();
  assert.equal(downloads[0][0], "route-survey-2026-07-28T00-00-00-000Z.json");
  assert.equal(downloads[0][2], "application/json");
  const exported = JSON.parse(downloads[0][1]);
  assert.equal(exported.meta.configId, "cfg");
  assert.equal(exported.meta.clientIp, "192.0.2.1");
  assert.equal(exported.meta.intervalMs, 1000);
  assert.equal(exported.meta.spacingM, 10);
  assert.deepEqual(exported.samples, sessionState.samples);
  assert.match(downloads[1][0], /\.csv$/);
  assert.equal(downloads[1][2], "text/csv");
  assert.match(downloads[1][1], /^"event","source","iso_sent"/);
  runner.actions.clearSession();
  assert.deepEqual(sessionState.samples, []);
  assert.deepEqual(sessionState.events, []);
  assert.deepEqual(sessionState.sampleCounts, { cloud: 0, lipi: 0 });
  assert.equal(sessionState.sampleSeq, 0);
  assert.equal(routeState.waypoints[0].state, "pending");
  assert.ok(mapCalls.some(call => call === "clear"));
  assert.deepEqual(statuses.at(-1), ["", "Session cleared — route kept"]);
  runner.actions.walkMainAction();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(runner.isRouteEditingBlocked(), true);
  runner.actions.endWalk();
  assert.equal(sessionState.walk.phase, "done");
  assert.equal(runner.isRouteEditingBlocked(), false);
  runner.updateWalkCard();
  const css = await readFile(new URL("./runner.css", import.meta.url), "utf8");
  for (const selector of [
    ".dot.polling", ".walk-card", ".btn-big.arrive", ".btn-big.depart",
    ".walk-secondary", ".log-item.evt", ".live-grid", ".pb-controls",
  ]) {
    assert.ok(css.includes(selector), `missing Runner selector ${selector}`);
  }
});
