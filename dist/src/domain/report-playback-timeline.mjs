// FEATURE:      V3 Report Player playback
// SURFACE:      playbackBounds(result), preparePlaybackTimeline(result)
// WHY TOGETHER: Bounds, capture ordering, and prepared poll truth share one cached timeline.
// STATE:        Weak cache of prepared immutable result timelines
// RULES:        Only capture evidence inside the recorded run enters the timeline.
// PROVENANCE:   Scope/steps/05a_recast_player.md playback contract

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildPlaybackPollTimeline } from "./report-poll-timeline.mjs";

const preparedResults = new WeakMap();

export function playbackBounds(result) {
  const startMs = timestamp(result?.run?.startedAt, "run.startedAt");
  const endMs = timestamp(result?.run?.stoppedAt, "run.stoppedAt");
  if (endMs < startMs) {
    throw new TypeError("run.stoppedAt must not precede run.startedAt");
  }
  return { startMs, endMs, durationMs: endMs - startMs };
}

export function preparePlaybackTimeline(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("result must be an object");
  }
  if (preparedResults.has(result)) return preparedResults.get(result);
  const bounds = playbackBounds(result);
  const checkIns = timed(result.checkIns, checkIn => checkIn.at)
    .filter(item => inRun(item.atMs, bounds));
  const events = timed(result.events, event => event.at)
    .filter(item => inRun(item.atMs, bounds));
  const captureEvents = [
    ...checkIns.map(item => ({
      atMs: item.atMs,
      capture: { kind: "check-in", atMs: item.atMs, value: item.value },
    })),
    ...events.map(item => ({
      atMs: item.atMs,
      capture: { kind: "event", atMs: item.atMs, value: item.value },
    })),
  ].sort((left, right) => left.atMs - right.atMs);
  const truth = buildGroundTruthModel(result);
  const pollCycles = buildPlaybackPollTimeline(result, bounds, truth);
  const eventTimes = uniqueTimes([
    bounds.startMs,
    ...captureEvents.map(item => item.atMs),
    bounds.endMs,
  ]);
  const transitionTimes = uniqueTimes([
    ...eventTimes,
    ...pollCycles.flatMap(item => [item.sentMs, item.receivedMs])
      .filter(atMs => inRun(atMs, bounds)),
  ]);
  const timeline = {
    bounds,
    checkIns,
    events,
    captureEvents,
    truth,
    pollCycles,
    eventTimes,
    transitionTimes,
  };
  preparedResults.set(result, timeline);
  return timeline;
}

function timed(values, getTime) {
  return (Array.isArray(values) ? values : [])
    .map(value => ({
      atMs: timestamp(getTime(value), "capture timestamp"),
      value,
    }))
    .sort((left, right) => left.atMs - right.atMs);
}

function uniqueTimes(values) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function timestamp(value, path) {
  const milliseconds = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${path} must be an ISO timestamp`);
  return milliseconds;
}

function inRun(atMs, bounds) {
  return atMs >= bounds.startMs && atMs <= bounds.endMs;
}
