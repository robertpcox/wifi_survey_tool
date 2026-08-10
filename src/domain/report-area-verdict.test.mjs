// FEATURE:      Area-resolution visit verdict
// SURFACE:      node --test src/domain/report-area-verdict.test.mjs
// WHY TOGETHER: Window limits, time weighting, ties, and unscored cases define one vote.
// STATE:        Synthetic scored raw moments
// RULES:        One room visit gets one vote; corridor checkpoints remain single samples.
// PROVENANCE:   Cisco lag-aware MazeMap area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { areaVisitVerdict } from "./report-area-verdict.mjs";

test("persisted time beats poll frequency and evidence after 20 seconds is ignored", () => {
  const moments = [
    moment("wrong-room", 0, "old-room"),
    moment("wrong-room", 500, "old-room"),
    moment("wrong-room", 1_000, "old-room"),
    moment("wrong-room", 1_500, "old-room"),
    moment("resolved", 2_000),
    moment("wrong-room", 21_000, "late-room"),
  ];
  const verdict = areaVisitVerdict(dwell(30_000), moments);
  assert.equal(verdict.primary.status, "resolved");
  assert.equal(verdict.resolved, true);
  assert.equal(verdict.insideEvidenceSeconds, 18);
  assert.equal(verdict.outsideEvidenceSeconds, 2);
  assert.equal(verdict.windowSeconds, 20);
  assert.equal(verdict.windowComplete, true);
});

test("an exact time tie fails and retains the representative wrong room", () => {
  const verdict = areaVisitVerdict(dwell(20_000), [
    moment("wrong-room", 0, "room-b"), moment("resolved", 10_000),
  ]);
  assert.equal(verdict.primary.status, "wrong-room");
  assert.equal(verdict.primary.room.id, "room-b");
  assert.equal(verdict.tied, true);
  assert.equal(verdict.scored, true);
  assert.equal(verdict.resolved, false);
});

test("positive short dwells score transparently while zero dwell stays unscored", () => {
  const short = areaVisitVerdict(dwell(15_000), [moment("resolved", 0)]);
  assert.equal(short.resolved, true);
  assert.equal(short.windowSeconds, 15);
  assert.equal(short.windowComplete, false);
  const zero = areaVisitVerdict({
    observationKind: "check-in", startMs: 0, endMs: 0,
  }, [moment("resolved", 0)]);
  assert.equal(zero.primary.status, "insufficient-window");
  assert.equal(zero.scored, false);
});

test("no-fix and wrong-floor time are both valid outside evidence", () => {
  const wrongFloor = areaVisitVerdict(dwell(20_000), [
    moment("no-displayed-fix", 0), moment("wrong-floor", 5_000),
  ]);
  assert.equal(wrongFloor.primary.status, "wrong-floor");
  assert.equal(wrongFloor.validEvidenceSeconds, 20);
  assert.equal(wrongFloor.outsideEvidenceSeconds, 20);
  const noFix = areaVisitVerdict(dwell(20_000), [
    moment("no-displayed-fix", 0), moment("no-displayed-fix", 20_000),
  ]);
  assert.equal(noFix.primary.status, "no-displayed-fix");
  assert.equal(noFix.scored, true);
  assert.equal(noFix.resolved, false);
  const lateFix = areaVisitVerdict(dwell(20_000), [
    moment("no-displayed-fix", 0), moment("resolved", 19_000),
  ]);
  assert.equal(lateFix.primary.status, "no-displayed-fix");
  assert.equal(lateFix.insideEvidenceSeconds, 1);
  assert.equal(lateFix.outsideEvidenceSeconds, 19);
});

test("corridor checkpoints remain one raw sample each", () => {
  const sample = areaVisitVerdict({ observationKind: "corridor-point" }, [
    moment("wrong-room", 0, "adjacent-room"),
  ]);
  assert.equal(sample.verdictBasis, "corridor-sample");
  assert.equal(sample.primary.room.id, "adjacent-room");
  assert.equal(sample.scored, true);
  assert.equal(sample.resolved, false);
});

function dwell(endMs) {
  return { observationKind: "dwell", startMs: 0, endMs, dwellSeconds: endMs / 1000 };
}

function moment(status, atMs, roomId = null) {
  return { status, atMs, room: roomId ? { id: roomId } : null };
}
