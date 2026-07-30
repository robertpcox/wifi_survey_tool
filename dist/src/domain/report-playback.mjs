// FEATURE:      V3 Report Player playback
// SURFACE:      playbackBounds, playbackEventTimes, playbackFrame
// WHY TOGETHER: Timeline clipping and deterministic frame projection define one player clock.
// STATE:        None
// RULES:        Clip to run time, exclude preflight, and remove future evidence on scrub-back.
// PROVENANCE:   Scope/steps/05a_recast_player.md playback contract

import { haversine } from "./geometry.mjs";
import { playbackPollEvidenceAt } from "./report-poll-evidence.mjs";
import {
  playbackBounds,
  preparePlaybackTimeline,
} from "./report-playback-timeline.mjs";

export { playbackBounds };

export function playbackEventTimes(result) {
  return [...preparePlaybackTimeline(result).eventTimes];
}

export function playbackFrame(result, atMs) {
  if (!Number.isFinite(atMs)) throw new TypeError("atMs must be finite milliseconds");
  const timeline = preparePlaybackTimeline(result);
  const time = clamp(atMs, timeline.bounds.startMs, timeline.bounds.endMs);
  const pollEvidence = playbackPollEvidenceAt(
    timeline.pollCycles,
    time,
    timeline.truth,
    timeline.bounds,
  );
  const polls = pollEvidence.completedPolls;
  const checkIns = through(timeline.checkIns, time);
  const events = through(timeline.events, time);
  const notes = through(timeline.notes, time);
  const elapsedMs = time - timeline.bounds.startMs;
  const latestFix = pollEvidence.latestRawFix?.fix ?? null;
  const walker = heldNotePosition(timeline.notes, time) ?? timeline.truth.at(time);
  return {
    bounds: timeline.bounds,
    atMs: time,
    clock: new Date(time).toISOString(),
    elapsedMs,
    progress: timeline.bounds.durationMs
      ? elapsedMs / timeline.bounds.durationMs
      : 1,
    preflight: result.run.preflight,
    latestFix,
    latestFixAgeSeconds: pollEvidence.latestRawFix?.fixAgeSeconds ?? null,
    currentPositionErrorM: latestFix && walker ? haversine(latestFix, walker) : null,
    latestPoll: pollEvidence.latestPoll,
    latestTiming: pollTiming(pollEvidence.latestPoll),
    polls,
    pollTrail: pollEvidence.changedFixPolls,
    changedFixHistory: pollEvidence.changedFixPolls,
    pollEvidence,
    chartSeries: pollEvidence.chartSeries,
    checkIns,
    events,
    notes,
    captureEvents: timeline.captureEvents
      .filter(item => item.atMs <= time)
      .map(item => item.capture),
    eventTimes: [...timeline.eventTimes],
    transitionTimes: [...timeline.transitionTimes],
    previousEventMs: previousEvent(timeline.eventTimes, time),
    nextEventMs: nextEvent(timeline.eventTimes, time),
    walker,
  };
}

function heldNotePosition(notes, atMs) {
  const note = notes.find(item => (
    atMs >= item.atMs && atMs < Date.parse(item.value.resumedAt)
  ))?.value;
  return note ? {
    ...note.groundTruth,
    moving: false,
    noteHold: true,
    noteId: note.id,
  } : null;
}

function through(items, atMs) {
  return items.filter(item => item.atMs <= atMs).map(item => item.value);
}

function previousEvent(eventTimes, atMs) {
  return eventTimes.findLast(value => value < atMs) ?? eventTimes[0] ?? null;
}

function nextEvent(eventTimes, atMs) {
  return eventTimes.find(value => value > atMs) ?? eventTimes.at(-1) ?? null;
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

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
