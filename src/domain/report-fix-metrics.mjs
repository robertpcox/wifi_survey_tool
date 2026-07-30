// FEATURE:      Report fix-matched analysis
// SURFACE:      buildFixLanes({ result, samples, thresholds, movingSeconds, stickySeconds, timeline, truth })
// WHY TOGETHER: Accuracy, freshness, and availability answer three separate commissioning questions.
// STATE:        None
// RULES:        Accuracy uses unique fixes at fixTime; freshness owns lag; availability owns dropouts.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import { buildLagBehind } from "./report-lag-behind.mjs";
import { buildNoPositionOutages } from "./report-no-position.mjs";
import { reportQuantile } from "./report-samples.mjs";

export function buildFixLanes({
  result,
  samples,
  thresholds,
  movingSeconds,
  stickySeconds,
  timeline,
  truth,
}) {
  const lag = buildLagBehind({ timeline, truth, thresholds });
  const noPosition = buildNoPositionOutages({
    result,
    timeline,
    truth,
    thresholdSeconds: thresholds.noPositionSeconds,
  });
  return {
    accuracy: accuracyLane(samples, thresholds),
    freshness: {
      ...freshnessLane(samples, thresholds, movingSeconds, stickySeconds),
      ...lag.metrics,
    },
    availability: {
      ...availabilityLane(result),
      noPositionSeconds: noPosition.totalSeconds,
      noPositionPercent: noPosition.percent,
      noPositionEpisodeCount: noPosition.episodes.length,
      noPositionThresholdSeconds: noPosition.thresholdSeconds,
    },
    lagSeries: lag.series,
    noPosition,
  };
}

function accuracyLane(samples, thresholds) {
  const scored = samples.filter(sample => Number.isFinite(sample.accuracyM));
  const errors = scored.map(sample => sample.accuracyM);
  const judged = scored.filter(sample => sample.withinConfidence !== null);
  const within = judged.filter(sample => sample.withinConfidence).length;
  const beyondThreshold = errors.filter(value => value > thresholds.accuracyM).length;
  return {
    uniqueFixCount: samples.length,
    scoredFixCount: scored.length,
    medianAccuracyM: round(reportQuantile(errors, 0.5)),
    p95AccuracyM: round(reportQuantile(errors, 0.95)),
    maxAccuracyM: errors.length ? round(Math.max(...errors)) : null,
    beyondThresholdCount: beyondThreshold,
    beyondThresholdPercent: scored.length
      ? percent(beyondThreshold, scored.length)
      : null,
    confidenceJudgedCount: judged.length,
    withinConfidenceCount: within,
    withinConfidencePercent: judged.length
      ? percent(within, judged.length)
      : null,
    beyondConfidencePercent: judged.length
      ? percent(judged.length - within, judged.length)
      : null,
  };
}

function freshnessLane(samples, thresholds, movingSeconds, stickySeconds) {
  const latencies = samples.map(sample => sample.deliveryLatencySeconds)
    .filter(Number.isFinite);
  const timed = samples.filter(sample => sample.hasFixTime);
  const intervals = timed.slice(1)
    .map((sample, index) => (sample.fixMs - timed[index].fixMs) / 1000)
    .filter(value => Number.isFinite(value) && value >= 0);
  const holds = samples.map(sample => sample.holdSeconds).filter(Number.isFinite);
  return {
    medianDeliveryLatencySeconds: round(reportQuantile(latencies, 0.5)),
    p95DeliveryLatencySeconds: round(reportQuantile(latencies, 0.95)),
    maxDeliveryLatencySeconds: latencies.length ? round(Math.max(...latencies)) : null,
    medianFixIntervalSeconds: round(reportQuantile(intervals, 0.5)),
    p95FixIntervalSeconds: round(reportQuantile(intervals, 0.95)),
    maxFixIntervalSeconds: intervals.length ? round(Math.max(...intervals)) : null,
    longestHoldSeconds: holds.length ? round(Math.max(...holds)) : null,
    noFreshFixSeconds: round(stickySeconds),
    noFreshFixPercent: percent(stickySeconds, movingSeconds),
    stickyThresholdSeconds: thresholds.stickySeconds,
  };
}

function availabilityLane(result) {
  const startMs = Date.parse(result.run.startedAt);
  const endMs = Date.parse(result.run.stoppedAt);
  const polls = result.polls.filter(poll => {
    const receivedMs = Date.parse(poll.receivedAt);
    return poll.id !== result.run.preflight.sampleId
      && Number.isFinite(receivedMs)
      && receivedMs >= startMs
      && receivedMs <= endMs;
  });
  const successes = polls.filter(poll => poll.success === true);
  const rtts = polls.map(poll => poll.roundTripMs).filter(Number.isFinite);
  return {
    pollCount: polls.length,
    successCount: successes.length,
    failureCount: polls.length - successes.length,
    successPercent: percent(successes.length, polls.length),
    medianRttMs: round(reportQuantile(rtts, 0.5)),
    p95RttMs: round(reportQuantile(rtts, 0.95)),
  };
}

function percent(part, whole) {
  return whole > 0 ? round(part / whole * 100) : 0;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
