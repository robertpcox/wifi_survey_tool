// FEATURE:      V3 result playback
// SURFACE:      playbackBounds(result), playbackFrame(result, atMs)
// WHY TOGETHER: Timeline clipping and frame projection define one playback contract.
// STATE:        Weak cache of prepared immutable result timelines
// RULES:        Clip to run time and keep preflight evidence out of the walked poll trail.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { buildGroundTruthModel } from "./report-ground-truth.mjs";

const preparedResults = new WeakMap();

export function playbackBounds(result) {
  const startMs = timestamp(result?.run?.startedAt, "run.startedAt");
  const endMs = timestamp(result?.run?.stoppedAt, "run.stoppedAt");
  if (endMs < startMs) {
    throw new TypeError("run.stoppedAt must not precede run.startedAt");
  }
  return { startMs, endMs, durationMs: endMs - startMs };
}

export function playbackFrame(result, atMs) {
  if (!Number.isFinite(atMs)) throw new TypeError("atMs must be finite milliseconds");
  const timeline = prepare(result);
  const time = clamp(atMs, timeline.bounds.startMs, timeline.bounds.endMs);
  const polls = through(timeline.polls, time);
  const checkIns = through(timeline.checkIns, time);
  const events = through(timeline.events, time);
  const latestPoll = polls.at(-1) ?? null;
  const latestFixPoll = polls.findLast(hasUsableFix) ?? null;
  const elapsedMs = time - timeline.bounds.startMs;
  return {
    bounds: timeline.bounds,
    atMs: time,
    clock: new Date(time).toISOString(),
    elapsedMs,
    progress: timeline.bounds.durationMs
      ? elapsedMs / timeline.bounds.durationMs
      : 1,
    preflight: result.run.preflight,
    latestFix: latestFixPoll?.normalized ?? null,
    latestPoll,
    latestTiming: pollTiming(latestPoll),
    polls,
    pollTrail: polls.filter(hasUsableFix),
    checkIns,
    events,
    captureEvents: timeline.captureEvents
      .filter(item => item.atMs <= time)
      .map(item => item.capture),
    walker: timeline.truth.at(time),
  };
}

function prepare(result) {
  if (!result || typeof result !== "object") {
    throw new TypeError("result must be an object");
  }
  if (preparedResults.has(result)) return preparedResults.get(result);
  const bounds = playbackBounds(result);
  const preflightId = result.run?.preflight?.sampleId;
  const polls = timed(result.polls, poll => poll.receivedAt)
    .filter(item => item.value.id !== preflightId)
    .filter(item => inRun(item.atMs, bounds))
    .filter(item => timestamp(item.value.sentAt, "poll.sentAt") >= bounds.startMs);
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
  const timeline = {
    bounds,
    polls,
    checkIns,
    events,
    captureEvents,
    truth: buildGroundTruthModel(result),
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

function through(items, atMs) {
  return items
    .filter(item => item.atMs <= atMs)
    .map(item => item.value);
}

function hasUsableFix(poll) {
  const fix = poll?.normalized;
  return Boolean(poll?.success)
    && Number.isFinite(fix?.lng)
    && Number.isFinite(fix?.lat)
    && Number.isFinite(fix?.z);
}

function pollTiming(poll) {
  return poll ? {
    sentAt: poll.sentAt,
    receivedAt: poll.receivedAt,
    roundTripMs: poll.roundTripMs,
    httpStatus: poll.httpStatus,
    success: poll.success,
    error: poll.error,
  } : null;
}

function timestamp(value, path) {
  const milliseconds = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${path} must be an ISO timestamp`);
  return milliseconds;
}

function inRun(atMs, bounds) {
  return atMs >= bounds.startMs && atMs <= bounds.endMs;
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
