// FEATURE:      Report effective-availability analysis
// SURFACE:      buildNoPositionOutages({ result, timeline, truth, thresholdSeconds })
// WHY TOGETHER: HTTP-200 responses serving stale fixes and failed polls form one dropout measure.
// STATE:        None
// RULES:        Time counts once a served fix is older than the threshold or the poll failed.
// PROVENANCE:   NDH availability lane · provider always 200s with the last-ever fix

export function buildNoPositionOutages({
  result,
  timeline,
  truth,
  thresholdSeconds,
}) {
  const startMs = Date.parse(result.run.startedAt);
  const stopMs = Date.parse(result.run.stoppedAt);
  const heldSince = new Map(timeline.map(sample => [
    sample.pollId,
    sample.heldSinceMs,
  ]));
  const preflightId = result.run.preflight.sampleId;
  const polls = result.polls.filter(poll => {
    const receivedMs = Date.parse(poll.receivedAt);
    return poll.id !== preflightId
      && Number.isFinite(receivedMs)
      && receivedMs >= startMs
      && receivedMs <= stopMs;
  }).sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt));
  const intervals = [];
  polls.forEach((poll, index) => {
    const from = Date.parse(poll.receivedAt);
    const next = polls[index + 1];
    const to = next ? Date.parse(next.receivedAt) : stopMs;
    if (!(to > from)) return;
    const held = heldSince.get(poll.id);
    if (poll.success !== true || !Number.isFinite(held)) {
      intervals.push([from, to]);
      return;
    }
    const staleFromMs = Math.max(from, held + thresholdSeconds * 1000);
    if (staleFromMs < to) intervals.push([staleFromMs, to]);
  });
  const episodes = merge(intervals)
    .map(([startedMs, endedMs]) => episode(startedMs, endedMs, truth));
  const totalSeconds = episodes
    .reduce((total, item) => total + item.durationSeconds, 0);
  const runSeconds = (stopMs - startMs) / 1000;
  return {
    thresholdSeconds,
    totalSeconds: round(totalSeconds),
    percent: runSeconds > 0 ? round(totalSeconds / runSeconds * 100) : 0,
    episodes,
  };
}

function merge(intervals) {
  const sorted = [...intervals].sort((left, right) => left[0] - right[0]);
  const merged = [];
  for (const [from, to] of sorted) {
    const last = merged.at(-1);
    if (last && from <= last[1] + 1) last[1] = Math.max(last[1], to);
    else merged.push([from, to]);
  }
  return merged;
}

function episode(startedMs, endedMs, truth) {
  const midMs = Math.min(
    Math.max((startedMs + endedMs) / 2, truth.startMs),
    truth.endMs,
  );
  const mid = truth.at(midMs);
  return {
    startedAt: new Date(startedMs).toISOString(),
    endedAt: new Date(endedMs).toISOString(),
    durationSeconds: round((endedMs - startedMs) / 1000),
    z: mid?.z ?? null,
    lat: mid?.lat ?? null,
    lng: mid?.lng ?? null,
    routeDistanceM: round(mid?.routeDistanceM),
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
