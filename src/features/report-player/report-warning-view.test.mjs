// FEATURE:      Report evidence warnings
// SURFACE:      node --test src/features/report-player/report-warning-view.test.mjs
// WHY TOGETHER: Warning copy, severity hooks, floor names, and Player handoff form one view contract.
// STATE:        Minimal analyzed warning fixture
// RULES:        Warnings contain no inferred network or RF root cause.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  bindReportWarningActions,
  renderReportWarnings,
} from "./report-warning-view.mjs";

const analysis = {
  thresholds: { stickySeconds: 5 },
  floors: [{ z: 0, name: "Ground" }, { z: 1, name: "First" }],
  warnings: {
    stalePosition: warning({
      representative: { atMs: 10, at: "2026-07-30T01:00:00.000Z", pollId: "poll-stale" },
    }),
    floorMismatch: warning({
      representative: {
        atMs: 20,
        at: "2026-07-30T01:00:20.000Z",
        pollId: "poll-floor",
        z: 1,
        reportedZ: 0,
      },
      floorPairs: [{ groundTruthZ: 0, reportedZ: 1, affectedSeconds: 2 }],
    }),
  },
};

test("active evidence renders prominent stale and named-floor warnings", () => {
  const html = renderReportWarnings(analysis);
  assert.match(html, /data-warning-kind="stale-position"/);
  assert.match(html, /beyond 5 s while the tester was moving/);
  assert.match(html, /data-warning-kind="floor-mismatch"/);
  assert.match(html, /Reported Ground while route ground truth was First/);
  assert.match(html, /2026-07-30T01:00:20.000Z/);
  assert.match(html, /poll poll-floor/);
  assert.equal((html.match(/data-warning-play/g) ?? []).length, 2);
  assert.doesNotMatch(html, /\bAP\b|root cause|RF/);
});

test("clear evidence renders one explicit all-clear state", () => {
  const html = renderReportWarnings({
    thresholds: { stickySeconds: 5 },
    warnings: {
      stalePosition: { active: false },
      floorMismatch: { active: false },
    },
  });
  assert.match(html, /data-warning-state="clear"/);
  assert.doesNotMatch(html, /data-warning-play/);
});

test("warning action hands exact time and poll identity to Player", () => {
  const calls = [];
  const button = {
    dataset: { warningAtMs: "20", warningPollId: "poll-floor" },
    addEventListener(_name, listener) { this.listener = listener; },
  };
  const count = bindReportWarningActions(
    { querySelectorAll: () => [button] },
    value => calls.push(value),
  );
  button.listener();
  assert.equal(count, 1);
  assert.deepEqual(calls, [{ atMs: 20, pollId: "poll-floor" }]);
});

function warning(overrides = {}) {
  return {
    active: true,
    affectedSeconds: 8,
    affectedPercent: 12.5,
    episodeCount: 1,
    worstSeconds: 8,
    representative: { atMs: 10, pollId: "poll-1" },
    floorPairs: [],
    ...overrides,
  };
}
