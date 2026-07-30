// FEATURE:      Report lag-behind analysis
// SURFACE:      buildLagBehind({ timeline, truth, thresholds })
// WHY TOGETHER: Signed spatial lag per poll and its moving-time statistics share one route axis.
// STATE:        None
// RULES:        Positive lag trails the walker; the served fix keeps the walker's route pass.
// PROVENANCE:   NDH freshness lane · how far behind the dot ran

import {
  createReportRouteAxis,
  travelDirectionAt,
} from "./report-route-axis.mjs";
import { reportQuantile } from "./report-samples.mjs";

const LAG_WINDOW_M = 100;
const MAX_CROSS_TRACK_M = 15;
const LAG_TIE_M = 3;
const AGE_SLACK_SECONDS = 10;
const MAX_WALK_SPEED_MS = 2;

export function buildLagBehind({ timeline, truth, thresholds }) {
  const axis = createReportRouteAxis(truth.route);
  const series = timeline.map(sample => lagSample(sample, truth, axis));
  const moving = series.filter(item => (
    item.moving && Number.isFinite(item.lagBehindM)
  ));
  const lags = moving.map(item => item.lagBehindM);
  const beyond = lags.filter(value => value > thresholds.accuracyM).length;
  return {
    series,
    metrics: {
      lagSampleCount: moving.length,
      medianLagBehindM: round(reportQuantile(lags, 0.5)),
      p95LagBehindM: round(reportQuantile(lags, 0.95)),
      maxLagBehindM: lags.length ? round(Math.max(...lags)) : null,
      lagBeyondThresholdPercent: moving.length
        ? round(beyond / moving.length * 100)
        : null,
    },
  };
}

function lagSample(sample, truth, axis) {
  const truthDistanceM = sample.groundTruth?.routeDistanceM;
  const servedDistanceM = Number.isFinite(truthDistanceM)
    ? servedRouteDistance(truth.route, sample, truthDistanceM)
    : null;
  return {
    pollId: sample.pollId,
    at: new Date(sample.receivedMs).toISOString(),
    moving: sample.groundTruth?.moving === true,
    direction: travelDirectionAt(truth, axis, sample.receivedMs),
    lagBehindM: Number.isFinite(servedDistanceM)
      ? round(truthDistanceM - servedDistanceM)
      : null,
  };
}

function servedRouteDistance(route, sample, truthDistanceM) {
  const plausibleM = Math.min(
    LAG_WINDOW_M,
    (Math.max(0, sample.fixAgeSeconds) + AGE_SLACK_SECONDS) * MAX_WALK_SPEED_MS,
  );
  const candidates = route.legs.map(leg => route.project(sample.fix, {
    legIndex: leg.index,
    minDistanceM: Math.max(0, truthDistanceM - plausibleM),
    maxDistanceM: Math.min(route.totalDistanceM, truthDistanceM + plausibleM),
    z: sample.fix.z,
  })).filter(candidate => (
    Number.isFinite(candidate?.projectionDistanceM)
    && candidate.projectionDistanceM <= MAX_CROSS_TRACK_M
  ));
  if (!candidates.length) return null;
  const nearestM = Math.min(
    ...candidates.map(candidate => candidate.projectionDistanceM),
  );
  return candidates
    .filter(candidate => candidate.projectionDistanceM <= nearestM + LAG_TIE_M)
    .reduce((best, candidate) => (
      Math.abs(candidate.routeDistanceM - truthDistanceM)
        < Math.abs(best.routeDistanceM - truthDistanceM)
        ? candidate
        : best
    )).routeDistanceM;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
