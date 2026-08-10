// FEATURE:      Displayed Cisco position snapshot
// SURFACE:      displayedCiscoFix(result, atMs)
// WHY TOGETHER: Room and corridor evidence must sample the same Player blue-dot state.
// STATE:        None
// RULES:        Use latest raw received fix only; never use route snapping or future polls.
// PROVENANCE:   Dynamic MazeMap area-resolution evidence

import { playbackFrame } from "./report-playback.mjs";
import { preparePlaybackTimeline } from "./report-playback-timeline.mjs";

export function displayedCiscoFix(result, atMs) {
  const frame = playbackFrame(result, atMs);
  const fix = frame.latestFix;
  if (!fix || ![fix.lng, fix.lat, fix.z].every(Number.isFinite)) {
    return Object.freeze({ atMs, point: null, pollId: null, ageSeconds: null });
  }
  return Object.freeze({
    atMs,
    point: { lng: fix.lng, lat: fix.lat, z: fix.z },
    pollId: frame.pollEvidence?.latestRawFix?.pollId ?? null,
    ageSeconds: Number.isFinite(frame.latestFixAgeSeconds)
      ? frame.latestFixAgeSeconds : null,
  });
}

export function displayedCiscoFixSeries(result, startMs, endMs) {
  const timeline = preparePlaybackTimeline(result);
  const times = [
    startMs,
    ...timeline.pollCycles.map(item => item.receivedMs)
      .filter(atMs => atMs > startMs && atMs < endMs),
    endMs,
  ];
  return [...new Set(times)].sort((left, right) => left - right)
    .map(atMs => displayedCiscoFix(result, atMs));
}
