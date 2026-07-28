import assert from "node:assert/strict";
import test from "node:test";

import { createCaptureView } from "./capture-view.mjs";

function viewHarness() {
  const ids = [
    "liveCloud", "liveLipi", "liveJson", "logList", "pbPanel",
    "pbInfo", "pbSlider", "pbTime", "walkPrompt", "walkTarget",
    "pbSpeed", "pbPlayBtn",
  ];
  const elements = Object.fromEntries(ids.map(id => [
    id,
    { innerHTML: "", textContent: "", style: {}, value: "" },
  ]));
  const documentRef = {
    getElementById: id => elements[id] ?? null,
  };
  return {
    elements,
    view: createCaptureView(documentRef, () => 12_500),
  };
}

test("updateLive renders successful and failed source samples safely", () => {
  const { elements, view } = viewHarness();
  view.updateLive({
    source: "cloud",
    ok: true,
    isoRecv: "2026-07-28T00:00:00.000Z",
    rttMs: 35,
    data: {
      latitude: -45.8,
      longitude: 170.5,
      zLevel: 2,
      confidenceFactor: 0,
      lastSeen: 9_000,
      locationName: "<North & West>",
    },
  });
  assert.match(elements.liveCloud.innerHTML, /-45\.800000, 170\.500000/);
  assert.match(elements.liveCloud.innerHTML, /conf 0/);
  assert.match(elements.liveCloud.innerHTML, /lastSeen 4s old · rtt 35 ms/);
  assert.match(
    elements.liveCloud.innerHTML,
    /&lt;North &amp; West&gt;/,
  );
  assert.match(elements.liveJson.textContent, /latest cloud/);

  view.updateLive({
    source: "lipi",
    ok: false,
    isoRecv: "2026-07-28T00:00:01.000Z",
    error: "<offline>",
  });
  assert.match(elements.liveLipi.innerHTML, /&lt;offline&gt;/);
  assert.match(elements.liveJson.textContent, /"error": "<offline>"/);
});

test("renderLog reverses events, formats check-ins, and escapes labels", () => {
  const { elements, view } = viewHarness();
  view.renderLog([
    {
      type: "checkin",
      tMs: 1_000,
      wpSeq: 0,
      wpName: "<Lobby>",
      lat: -45.8,
      lng: 170.5,
      z: 1,
    },
    {
      type: "walk_end",
      tMs: 2_000,
      note: "done & safe",
    },
  ]);
  const html = elements.logList.innerHTML;
  assert.ok(html.indexOf("walk_end") < html.indexOf("#1"));
  assert.match(html, /&lt;Lobby&gt;/);
  assert.match(html, /done &amp; safe/);
  assert.match(html, /-45\.800000, 170\.500000 · z1/);

  view.renderLog([]);
  assert.match(elements.logList.innerHTML, /events appear here/);
});

test("playback view exposes its controls and renders playback state", () => {
  const { elements, view } = viewHarness();
  elements.pbSpeed.value = "2";
  const playback = {
    t0: 1_000,
    t1: 4_500,
    t: 2_750,
  };
  view.showPlayback({
    samples: [{}, {}],
    events: [{ type: "checkin" }, { type: "walk_end" }],
  }, playback);
  assert.equal(elements.pbPanel.style.display, "flex");
  assert.equal(elements.pbInfo.textContent, "2 samples, 1 check-ins, 4s");

  view.renderPlayback(playback, {
    type: "checkin",
    wpName: "Lobby",
  });
  assert.equal(elements.pbSlider.value, 500);
  assert.equal(elements.walkPrompt.textContent, "Playback");
  assert.equal(elements.walkTarget.textContent, "checkin — Lobby");
  assert.equal(view.playbackSpeed(), 2);

  view.setPlaybackPlaying(true);
  assert.equal(elements.pbPlayBtn.textContent, "❚❚ Pause");
  view.setPlaybackPlaying(false);
  assert.equal(elements.pbPlayBtn.textContent, "▶ Play");
  view.hidePlayback();
  assert.equal(elements.pbPanel.style.display, "none");
});
