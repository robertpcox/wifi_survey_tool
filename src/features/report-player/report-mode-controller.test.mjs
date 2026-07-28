// FEATURE:      Merged Report Player modes
// SURFACE:      node --test src/features/report-player/report-mode-controller.test.mjs
// WHY TOGETHER: Mode markup, pause ordering, body scroll, map layers, and seek switch atomically.
// STATE:        Fake root, shared surface, Player, store, body, and window scroll
// RULES:        Leaving Player pauses first, preserves its clock, and restores Report scrolling.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { bindReportModes } from "./report-mode-controller.mjs";

test("programmatic mode and seek pause Player, preserve time, and restore Report scroll", async () => {
  const fixture = modeFixture();
  const modes = bindReportModes(fixture.options);
  fixture.calls.length = 0;
  assert.equal(modes.setMode("playback", { atMs: 4_200, pollId: "poll-2" }), "playback");
  assert.equal(modes.mode, "playback");
  assert.equal(modes.atMs, 4_200);
  assert.equal(fixture.root.classList.has("is-player"), true);
  assert.equal(fixture.body.classList.has("player-active"), true);
  assert.equal(fixture.context.hidden, true);
  assert.equal(fixture.panes.playback.hidden, false);
  assert.deepEqual(fixture.calls.slice(0, 3), [
    ["store", "playback"],
    ["surface-mode", "playback"],
    ["player-active", true],
  ]);
  fixture.calls.length = 0;
  modes.setMode("analysis");
  assert.deepEqual(fixture.calls.slice(0, 2), [
    ["player-active", false],
    ["surface-mode", "analysis"],
  ]);
  await Promise.resolve();
  assert.equal(modes.atMs, 4_200);
  assert.equal(fixture.body.classList.has("player-active"), false);
  assert.deepEqual(fixture.scrolls, [[0, 135]]);
  fixture.calls.length = 0;
  const frame = modes.seek(7_000);
  assert.equal(modes.mode, "playback");
  assert.equal(frame.atMs, 7_000);
  assert.ok(fixture.calls.some(call => call[0] === "surface-mode"));
  modes.destroy();
  assert.equal(fixture.body.classList.has("player-active"), false);
});

function modeFixture() {
  const calls = [];
  const scrolls = [];
  const buttons = [button("analysis"), button("playback")];
  const paneList = [pane("analysis"), pane("playback")];
  const context = { hidden: false };
  const body = { classList: classSet() };
  const root = {
    classList: classSet(),
    ownerDocument: { body },
    querySelectorAll(selector) {
      if (selector === "[data-report-view]") return buttons;
      if (selector === "[data-report-pane]") return paneList;
      return [];
    },
    querySelector: () => context,
  };
  const player = {
    atMs: 0,
    destroy: () => calls.push(["destroy"]),
    focusEvidence: id => calls.push(["focus", id]),
    seek(value) { this.atMs = value; calls.push(["seek", value]); return { atMs: value }; },
    setActive: value => calls.push(["player-active", value]),
  };
  const surface = {
    onEvidenceSelect: () => () => calls.push(["unsubscribe"]),
    setViewMode: value => calls.push(["surface-mode", value]),
    settleLayout: () => { calls.push(["settle"]); return Promise.resolve(); },
  };
  return {
    calls, scrolls, root, body, context,
    panes: { analysis: paneList[0], playback: paneList[1] },
    options: {
      root,
      store: {
        snapshot: () => ({ view: "analysis" }),
        setView: value => calls.push(["store", value]),
      },
      surface,
      player,
      windowRef: {
        scrollY: 135,
        scrollTo: (...value) => scrolls.push(value),
      },
    },
  };
}

function button(reportView) {
  return {
    dataset: { reportView },
    addEventListener(name, listener) { this[name] = listener; },
    setAttribute(name, value) { this[name] = value; },
  };
}

function pane(reportPane) {
  return { dataset: { reportPane }, hidden: false };
}

function classSet() {
  const values = new Set();
  values.toggle = (name, force) => force ? values.add(name) : values.delete(name);
  values.remove = name => values.delete(name);
  return values;
}
