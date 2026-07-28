// FEATURE:      Report Player analysis
// SURFACE:      buildReportTimeline, publicReportSample, reportQuantile, reportTruthOverlaps
// WHY TOGETHER: Fix identity normalization and sample classification share one ordered pass.
// STATE:        None
// RULES:        Fix time wins; coordinates and z form the fallback stable signature.
// PROVENANCE:   Step 5 sticky-position analysis contract

import { haversine } from "./geometry.mjs";

export function buildReportTimeline(result, truth, thresholds) {
  let priorKey = null;
  let signatureSinceMs = null;
  const startMs = Date.parse(result.run.startedAt);
  const endMs = Date.parse(result.run.stoppedAt);
  const preflightId = result.run.preflight.sampleId;
  return result.polls.filter(poll => (
    validPoll(poll)
    && poll.id !== preflightId
    && Date.parse(poll.receivedAt) >= startMs
    && Date.parse(poll.receivedAt) <= endMs
  ))
    .sort((left, right) => Date.parse(left.receivedAt) - Date.parse(right.receivedAt))
    .map(poll => {
      const receivedMs = Date.parse(poll.receivedAt);
      const fixMs = Date.parse(poll.normalized.fixTime);
      const key = fixKey(poll.normalized, fixMs);
      if (key !== priorKey) signatureSinceMs = receivedMs;
      priorKey = key;
      const sample = {
        pollId: poll.id,
        receivedMs,
        heldSinceMs: Number.isFinite(fixMs)
          ? Math.min(fixMs, receivedMs)
          : signatureSinceMs,
        fix: {
          lat: poll.normalized.lat,
          lng: poll.normalized.lng,
          z: poll.normalized.z,
        },
        roundTripMs: poll.roundTripMs,
      };
      return classify(sample, truth, thresholds);
    });
}

export function publicReportSample(sample) {
  const {
    heldSinceMs,
    receivedMs,
    ...publicFields
  } = sample;
  return {
    ...publicFields,
    receivedAt: new Date(receivedMs).toISOString(),
  };
}

export function reportQuantile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[Math.ceil(index)] * weight;
}

export function reportTruthOverlaps(segments, startMs, endMs) {
  return segments.map(segment => ({
    ...segment,
    startMs: Math.max(segment.startMs, startMs),
    endMs: Math.min(segment.endMs, endMs),
  })).filter(segment => segment.endMs > segment.startMs);
}

export function reportAccuracyAt(sample, truth, atMs) {
  const groundTruth = truth.at(atMs);
  return {
    groundTruth,
    distanceM: groundTruth ? haversine(sample.fix, groundTruth) : null,
  };
}

function validPoll(poll) {
  return poll?.success
    && Number.isFinite(poll?.normalized?.lat)
    && Number.isFinite(poll?.normalized?.lng)
    && Number.isFinite(poll?.normalized?.z)
    && Number.isFinite(Date.parse(poll.receivedAt));
}

function fixKey(normalized, fixMs) {
  return Number.isFinite(fixMs)
    ? `time:${normalized.fixTime}`
    : `position:${normalized.lat}|${normalized.lng}|${normalized.z}`;
}

function classify(sample, truth, thresholds) {
  const { groundTruth, distanceM: accuracyM } = reportAccuracyAt(
    sample,
    truth,
    sample.receivedMs,
  );
  const fixAgeSeconds = (sample.receivedMs - sample.heldSinceMs) / 1000;
  return {
    ...sample,
    groundTruth,
    accuracyM,
    fixAgeSeconds,
    sticky: Boolean(
      groundTruth?.moving && fixAgeSeconds > thresholds.stickySeconds
    ),
    outsideAccuracy: Number.isFinite(accuracyM)
      && accuracyM > thresholds.accuracyM,
  };
}
