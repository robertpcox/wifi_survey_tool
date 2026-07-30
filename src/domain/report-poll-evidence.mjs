// FEATURE:      Report Player poll evidence
// SURFACE:      playbackPollEvidenceAt(cycles, atMs, truth, bounds)
// WHY TOGETHER: In-flight, persistent outcomes, live fix, and chart points share one clock cut.
// STATE:        None
// RULES:        Scrub-back removes future outcomes and failures never move the live raw fix.
// PROVENANCE:   Scope/contracts/report_analysis.md playback poll map evidence

export function playbackPollEvidenceAt(cycles, atMs, truth, bounds) {
  const started = cycles.filter(cycle => cycle.sentMs <= atMs);
  const completed = cycles.filter(cycle => cycle.receivedMs <= atMs)
    .sort(compareReceived);
  const inFlight = started.filter(cycle => cycle.receivedMs > atMs)
    .map(cycle => inFlightEvidence(cycle, atMs, truth));
  const completedFailures = completed.filter(cycle => !cycle.usable)
    .map(failureEvidence);
  const completedOutcomes = completed
    .filter(cycle => cycle.usable && cycle.identityChanged)
    .map(outcomeEvidence);
  const unlocated = unlocatedEvidence(inFlight, completedFailures, completedOutcomes);
  const failures = completedFailures.filter(item => item.markerTruth);
  const outcomes = completedOutcomes.filter(item => item.routeEstimate);
  const latest = completed.findLast(cycle => cycle.usable) ?? null;
  return {
    inFlight,
    failures,
    outcomes,
    unlocated,
    latestRawFix: latest ? latestFixEvidence(latest, atMs) : null,
    latestPoll: completed.at(-1)?.poll ?? null,
    completedPolls: completed.map(cycle => cycle.poll),
    changedFixPolls: outcomes.map(item => item.poll),
    chartSeries: completed.filter(cycle => cycle.usable).map(cycle => ({
      atMs: cycle.receivedMs,
      elapsedMs: cycle.receivedMs - bounds.startMs,
      distanceM: cycle.distanceM,
      fixAgeSeconds: cycle.fixAgeSeconds,
      pollId: cycle.poll.id,
      identityChanged: cycle.identityChanged === true,
    })),
  };
}
function inFlightEvidence(cycle, atMs, truth) {
  const currentTruth = truth.at(atMs);
  const routeSpan = cycle.sentTruth && currentTruth
    ? truth.routeInterval(
      cycle.sentTruth.routeDistanceM,
      currentTruth.routeDistanceM,
    )
    : null;
  return {
    status: "in-flight",
    inFlight: true,
    pollId: cycle.poll.id,
    sentAt: cycle.poll.sentAt,
    sentMs: cycle.sentMs,
    sentTruth: cycle.sentTruth,
    currentTruth,
    routeSpan,
  };
}
function failureEvidence(cycle) {
  return {
    ...completedEvidence(cycle),
    status: "failure",
    failureKind: cycle.outcome,
    markerTruth: cycle.sentTruth,
    failureTruth: cycle.receivedTruth,
  };
}
function outcomeEvidence(cycle) {
  return {
    ...completedEvidence(cycle),
    status: "changed-fix",
    pairId: `poll:${cycle.poll.id}`,
    routeEstimate: cycle.receivedTruth,
    rawFix: cycle.poll.normalized,
  };
}

function completedEvidence(cycle) {
  const poll = cycle.poll;
  return {
    pollId: poll.id,
    poll,
    sentAt: poll.sentAt,
    receivedAt: poll.receivedAt,
    sentMs: cycle.sentMs,
    receivedMs: cycle.receivedMs,
    roundTripMs: poll.roundTripMs,
    httpStatus: poll.httpStatus,
    error: poll.error,
    sentTruth: cycle.sentTruth,
    receivedTruth: cycle.receivedTruth,
    routeSpan: cycle.routeSpan,
    normalized: poll.normalized,
    raw: poll.raw,
    identity: cycle.identity ?? null,
    identityChanged: cycle.identityChanged ?? false,
    coordinatesMoved: cycle.coordinatesMoved,
    floorChanged: cycle.floorChanged,
    fixAgeSeconds: cycle.fixAgeSeconds ?? null,
    distanceM: cycle.distanceM,
    floorMatch: cycle.floorMatch,
  };
}

function latestFixEvidence(cycle, atMs) {
  const poll = cycle.poll;
  return {
    pollId: poll.id,
    poll,
    fix: poll.normalized,
    raw: poll.raw,
    sentTruth: cycle.sentTruth,
    receivedTruth: cycle.receivedTruth,
    distanceM: cycle.distanceM,
    floorMatch: cycle.floorMatch,
    timing: {
      sentAt: poll.sentAt,
      receivedAt: poll.receivedAt,
      roundTripMs: poll.roundTripMs,
      httpStatus: poll.httpStatus,
    },
    receivedAt: poll.receivedAt,
    receivedMs: cycle.receivedMs,
    fixAgeSeconds: Math.max(0, (atMs - cycle.heldSinceMs) / 1000),
    identity: cycle.identity,
    identityChanged: cycle.identityChanged,
    coordinatesMoved: cycle.coordinatesMoved,
    floorChanged: cycle.floorChanged,
  };
}

function unlocatedEvidence(inFlight, failures, outcomes) {
  return [
    ...inFlight.filter(item => !item.sentTruth)
      .map(item => ({ ...item, unlocatedReason: "sent-route-estimate-unavailable" })),
    ...failures.filter(item => !item.markerTruth)
      .map(item => ({ ...item, unlocatedReason: "sent-route-estimate-unavailable" })),
    ...outcomes.filter(item => !item.routeEstimate)
      .map(item => ({
        ...item,
        unlocatedReason: "received-route-estimate-unavailable",
      })),
  ];
}

function compareReceived(left, right) {
  return left.receivedMs - right.receivedMs || left.index - right.index;
}
