// FEATURE:      Report request diagnostics
// SURFACE:      buildReportCaptureSeries(result, analysis)
// WHY TOGETHER: Successful positions and failed capture requests must share one elapsed-time axis.
// STATE:        None
// RULES:        Exclude preflight, retain failures, and never invent position evidence for a failed request.
// PROVENANCE:   Scope/steps/05b_improve_report.md observed request behavior

export function buildReportCaptureSeries(result, analysis) {
  const startedMs = Date.parse(result.run.startedAt);
  const stoppedMs = Date.parse(result.run.stoppedAt);
  const preflightId = result.run.preflight.sampleId;
  const samples = new Map(analysis.timeline.map(sample => [sample.pollId, sample]));
  const polls = result.polls.filter(poll => {
    const receivedMs = Date.parse(poll.receivedAt);
    return poll.id !== preflightId
      && Number.isFinite(receivedMs)
      && receivedMs >= startedMs
      && receivedMs <= stoppedMs;
  }).sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt));
  const timeline = polls.map(poll => capturePoint(poll, samples.get(poll.id), startedMs));
  return {
    timeline,
    requestFailures: timeline.filter(point => point.requestFailed),
    requestOutages: requestOutages(polls, startedMs),
  };
}

function capturePoint(poll, sample, startedMs) {
  return {
    pollId: poll.id,
    elapsedSeconds: round((Date.parse(poll.receivedAt) - startedMs) / 1000),
    accuracyM: finite(sample?.accuracyM),
    fixAgeSeconds: finite(sample?.fixAgeSeconds),
    roundTripMs: finite(poll.roundTripMs),
    reportedZ: sample?.fix?.z ?? null,
    actualZ: sample?.groundTruth?.z ?? null,
    moving: sample?.groundTruth?.moving === true,
    stale: sample?.sticky === true,
    outsideAccuracy: sample?.outsideAccuracy === true,
    wrongFloor: Number.isFinite(sample?.groundTruth?.z)
      && sample.fix.z !== sample.groundTruth.z,
    requestFailed: poll.success !== true,
    httpStatus: poll.httpStatus,
    error: poll.error ?? null,
  };
}

function requestOutages(polls, startedMs) {
  const outages = [];
  let active = null;
  for (const poll of polls) {
    if (poll.success === true) {
      if (active) outages.push(publicOutage(active, startedMs));
      active = null;
      continue;
    }
    active ??= {
      startedMs: Date.parse(poll.sentAt),
      endedMs: Date.parse(poll.receivedAt),
      polls: [],
    };
    active.endedMs = Math.max(active.endedMs, Date.parse(poll.receivedAt));
    active.polls.push(poll);
  }
  if (active) outages.push(publicOutage(active, startedMs));
  return outages;
}

function publicOutage(outage, runStartedMs) {
  const worst = [...outage.polls].sort((left, right) => (
    right.roundTripMs - left.roundTripMs || left.id.localeCompare(right.id)
  ))[0];
  return {
    startedAt: new Date(outage.startedMs).toISOString(),
    endedAt: new Date(outage.endedMs).toISOString(),
    elapsedSeconds: round((outage.startedMs - runStartedMs) / 1000),
    durationSeconds: round((outage.endedMs - outage.startedMs) / 1000),
    requestCount: outage.polls.length,
    worstRoundTripMs: finite(worst?.roundTripMs),
    httpStatus: worst?.httpStatus ?? null,
    error: worst?.error ?? null,
  };
}

function finite(value) {
  return Number.isFinite(value) ? round(value) : null;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
