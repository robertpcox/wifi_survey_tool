import assert from "node:assert/strict";
import test from "node:test";

import { createWalkView } from "./walk-view.mjs";

function makeDocument() {
  const ids = [
    "cntCheckin", "cntCloud", "cntLipi", "dotCloud", "dotLipi", "walkBtn",
    "walkDist", "walkPrompt", "walkSecondary", "walkTarget",
  ];
  const elements = Object.fromEntries(ids.map(id => {
    const node = {
      className: "",
      disabled: false,
      style: {},
      textContent: "",
    };
    node.classList = {
      add: name => {
        node.className += ` ${name}`;
      },
    };
    return [id, node];
  }));
  return { elements, getElementById: id => elements[id] };
}

function waypoint(id, kind, legIdx) {
  return {
    id,
    kind,
    lat: -36.85,
    legIdx,
    lng: 174.76,
    name: `Waypoint ${id}`,
    seq: id,
    state: "pending",
    stopIdx: kind === "stop" ? id : null,
    z: 2,
  };
}

test("createWalkView renders every walk phase, counts, source state, and distance", () => {
  const documentRef = makeDocument();
  const routeState = { legs: [], stops: [], waypoints: [] };
  const sessionState = {
    samples: [],
    walk: { history: [], phase: "idle", wpIdx: -1 },
  };
  const activeLegs = [];
  const view = createWalkView({
    documentRef,
    mapAdapter: { setActiveLeg: value => activeLegs.push(value) },
    nowMs: () => 6_000,
    routeState,
    sessionState,
  });
  view.resetCounts();
  assert.equal(documentRef.elements.cntCloud.textContent, "0");
  assert.equal(documentRef.elements.cntLipi.textContent, "0");
  assert.equal(documentRef.elements.cntCheckin.textContent, "0");
  view.setCheckinCount(3);
  view.setSourceCount("cloud", 4);
  view.setSourceCount("lipi", 5);
  assert.equal(documentRef.elements.cntCheckin.textContent, 3);
  assert.equal(documentRef.elements.cntCloud.textContent, 4);
  assert.equal(documentRef.elements.cntLipi.textContent, 5);
  view.setSourceState("cloud", "polling");
  view.setSourceState("lipi", "err");
  assert.equal(documentRef.elements.dotCloud.className, "dot polling");
  assert.equal(documentRef.elements.dotLipi.className, "dot err");
  view.setSourceState("cloud", "");
  assert.equal(documentRef.elements.dotCloud.className, "dot");
  view.updateCard();
  assert.equal(documentRef.elements.walkPrompt.textContent, "Route not built yet");
  assert.equal(documentRef.elements.walkBtn.disabled, true);
  routeState.stops = [{ tag: "A" }, { tag: "B" }, { tag: "C" }];
  routeState.legs = [
    { fromIdx: 0, toIdx: 1 },
    { fromIdx: 1, toIdx: 2 },
  ];
  routeState.waypoints = [
    waypoint(0, "stop", 0),
    waypoint(1, "mid", 0),
    waypoint(2, "stop", 1),
  ];
  view.updateCard();
  assert.equal(documentRef.elements.walkPrompt.textContent, "Route ready");
  assert.equal(documentRef.elements.walkTarget.textContent, "3 check-in points");
  assert.equal(documentRef.elements.walkBtn.textContent, "▶ Start walk");
  sessionState.walk = { history: [], phase: "walking", wpIdx: 1 };
  view.updateCard();
  assert.match(documentRef.elements.walkPrompt.textContent, /Point 2 of 3 · leg A→B/);
  assert.equal(documentRef.elements.walkBtn.textContent, "✓ I'm here");
  assert.equal(activeLegs.at(-1), 0);
  sessionState.walk.wpIdx = 2;
  view.updateCard();
  assert.equal(documentRef.elements.walkBtn.textContent, "🏁 Arrived — check in");
  assert.match(documentRef.elements.walkBtn.className, /arrive/);
  sessionState.walk.phase = "awaitDepart";
  view.updateCard();
  assert.equal(documentRef.elements.walkBtn.textContent, "▶ Depart C");
  assert.match(documentRef.elements.walkBtn.className, /depart/);
  sessionState.walk.phase = "done";
  view.updateCard();
  assert.equal(documentRef.elements.walkPrompt.textContent, "Walk complete");
  assert.equal(documentRef.elements.walkBtn.textContent, "↻ Restart walk");
  view.updateCard(true);
  assert.equal(documentRef.elements.walkPrompt.textContent, "Playback mode");
  assert.equal(documentRef.elements.walkBtn.disabled, true);
  assert.equal(documentRef.elements.walkSecondary.style.display, "none");
  sessionState.walk = { history: [], phase: "walking", wpIdx: 1 };
  sessionState.samples = [
    {
      data: { latitude: -36.85, longitude: 174.76 },
      ok: true,
      source: "cloud",
      tRecvMs: 1_000,
    },
    { data: null, ok: false, source: "lipi", tRecvMs: 5_000 },
  ];
  view.updateDistance();
  assert.equal(
    documentRef.elements.walkDist.textContent,
    "≈ 0.0 m from target (cloud, 5s ago)",
  );
  view.updateDistance(true);
  assert.equal(documentRef.elements.walkDist.textContent, "");
  createWalkView({
    documentRef: null,
    mapAdapter: {},
    nowMs: () => 0,
    routeState,
    sessionState,
  }).updateCard();
});
