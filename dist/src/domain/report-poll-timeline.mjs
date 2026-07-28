// FEATURE:      Report Player poll evidence
// SURFACE:      buildPlaybackPollTimeline(result, bounds, truth)
// WHY TOGETHER: Receipt ordering, fix identity, and route estimates require one ordered pass.
// STATE:        None
// RULES:        Exclude preflight; valid fix time wins identity; failures never update fix state.
// PROVENANCE:   Scope/contracts/report_analysis.md playback poll map evidence

import { haversine } from "./geometry.mjs";

export function buildPlaybackPollTimeline(result, bounds, truth) {
  const preflightId = result?.run?.preflight?.sampleId;
  const cycles = (result?.polls ?? []).map((poll, index) => {
    const sentMs = timestamp(poll.sentAt, `polls.${index}.sentAt`);
    const receivedMs = timestamp(poll.receivedAt, `polls.${index}.receivedAt`);
    if (receivedMs < sentMs) {
      throw new TypeError(`polls.${index}.receivedAt must not precede sentAt`);
    }
    return { poll, index, sentMs, receivedMs };
  }).filter(item => (
    item.poll.id !== preflightId
    && item.sentMs >= bounds.startMs
    && item.sentMs <= bounds.endMs
  ));
  annotateFixIdentity(cycles);
  return cycles.map(cycle => annotateRouteEvidence(cycle, truth))
    .sort(compareSent);
}

function annotateFixIdentity(cycles) {
  let priorIdentity = null;
  let priorFix = null;
  let heldSinceMs = null;
  for (const cycle of [...cycles].sort(compareReceived)) {
    cycle.usable = hasUsableFix(cycle.poll);
    cycle.outcome = cycle.usable
      ? "success"
      : (cycle.poll.success ? "unusable-success" : "failure");
    if (!cycle.usable) continue;
    const fix = cycle.poll.normalized;
    const fixTimeMs = optionalTimestamp(fix.fixTime);
    const identity = Number.isFinite(fixTimeMs)
      ? `time:${fixTimeMs}`
      : `position:${fix.lat}|${fix.lng}|${fix.z}`;
    cycle.identityChanged = identity !== priorIdentity;
    cycle.coordinatesMoved = priorFix
      ? priorFix.lat !== fix.lat || priorFix.lng !== fix.lng
      : null;
    cycle.floorChanged = priorFix ? priorFix.z !== fix.z : null;
    if (Number.isFinite(fixTimeMs)) {
      heldSinceMs = Math.min(fixTimeMs, cycle.receivedMs);
    } else if (cycle.identityChanged) {
      heldSinceMs = cycle.receivedMs;
    }
    cycle.identity = identity;
    cycle.heldSinceMs = heldSinceMs;
    cycle.fixAgeSeconds = Math.max(0, (cycle.receivedMs - heldSinceMs) / 1000);
    priorIdentity = identity;
    priorFix = fix;
  }
}

function annotateRouteEvidence(cycle, truth) {
  const sentTruth = truth.at(cycle.sentMs);
  const receivedTruth = truth.at(cycle.receivedMs);
  const routeSpan = sentTruth && receivedTruth
    ? truth.routeInterval(
      sentTruth.routeDistanceM,
      receivedTruth.routeDistanceM,
    )
    : null;
  const fix = cycle.usable ? cycle.poll.normalized : null;
  return {
    ...cycle,
    sentTruth,
    receivedTruth,
    routeSpan,
    distanceM: fix && receivedTruth ? haversine(fix, receivedTruth) : null,
    floorMatch: fix && receivedTruth ? fix.z === receivedTruth.z : null,
  };
}

function hasUsableFix(poll) {
  const fix = poll?.normalized;
  return Boolean(poll?.success)
    && Number.isFinite(fix?.lng)
    && Number.isFinite(fix?.lat)
    && Number.isFinite(fix?.z);
}

function compareSent(left, right) {
  return left.sentMs - right.sentMs || left.index - right.index;
}

function compareReceived(left, right) {
  return left.receivedMs - right.receivedMs || left.index - right.index;
}

function optionalTimestamp(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : Number.NaN;
  return typeof value === "string" ? Date.parse(value) : Number.NaN;
}

function timestamp(value, path) {
  const milliseconds = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${path} must be an ISO timestamp`);
  return milliseconds;
}
