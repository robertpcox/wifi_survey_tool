// FEATURE:      Report fix-matched analysis
// SURFACE:      buildUniqueFixSamples(result, truth), publicFixSample(sample)
// WHY TOGETHER: Provider-fix deduplication and fix-time scoring share one ordered pass.
// STATE:        None
// RULES:        Score each unique fix at its fixTime; fixes outside the truth window stay unscored.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import { haversine } from "./geometry.mjs";
import { reportFixKey, usableReportPolls } from "./report-samples.mjs";

export function buildUniqueFixSamples(result, truth) {
  const grouped = [];
  for (const poll of usableReportPolls(result)) {
    const receivedMs = Date.parse(poll.receivedAt);
    const fixMs = Date.parse(poll.normalized.fixTime);
    const key = reportFixKey(poll.normalized, fixMs);
    const prior = grouped.at(-1);
    if (prior && prior.key === key) {
      prior.lastReceivedMs = receivedMs;
      prior.pollCount += 1;
      continue;
    }
    grouped.push({
      key,
      pollId: poll.id,
      hasFixTime: Number.isFinite(fixMs),
      fixMs: Number.isFinite(fixMs) ? fixMs : receivedMs,
      firstReceivedMs: receivedMs,
      lastReceivedMs: receivedMs,
      pollCount: 1,
      fix: {
        lat: poll.normalized.lat,
        lng: poll.normalized.lng,
        z: poll.normalized.z,
      },
      confidenceM: Number.isFinite(poll.normalized.confidence)
        ? poll.normalized.confidence
        : null,
    });
  }
  return grouped.map(sample => scoreAtFixTime(sample, truth));
}

export function publicFixSample(sample) {
  const {
    key,
    hasFixTime,
    fixMs,
    firstReceivedMs,
    lastReceivedMs,
    ...publicFields
  } = sample;
  return {
    ...publicFields,
    fixTime: new Date(fixMs).toISOString(),
    firstReceivedAt: new Date(firstReceivedMs).toISOString(),
    lastReceivedAt: new Date(lastReceivedMs).toISOString(),
  };
}

function scoreAtFixTime(sample, truth) {
  const groundTruth = truth.at(sample.fixMs);
  const accuracyM = groundTruth ? haversine(sample.fix, groundTruth) : null;
  return {
    ...sample,
    groundTruth,
    accuracyM: round(accuracyM),
    withinConfidence: Number.isFinite(accuracyM)
      && Number.isFinite(sample.confidenceM)
      ? accuracyM <= sample.confidenceM
      : null,
    deliveryLatencySeconds: sample.hasFixTime
      ? round((sample.firstReceivedMs - sample.fixMs) / 1000)
      : null,
    holdSeconds: round((sample.lastReceivedMs - sample.firstReceivedMs) / 1000),
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
