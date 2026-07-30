// FEATURE:      Report Player ground truth
// SURFACE:      buildGroundTruthModel(result), buildReportGroundTruth(result)
// WHY TOGETHER: Check-in timing, planned dwell, and route-distance motion form one time model.
// STATE:        Projected check-ins and route segments captured by the returned lookup function
// RULES:        Dwell starts at check-in; movement follows exact embedded route geometry.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth contract

import { projectReportCheckIns } from "./report-check-in-route.mjs";
import { buildReportRoute } from "./report-route.mjs";
import {
  buildTruthSegments,
  publicTruthSegment,
  truthAtTime,
} from "./report-ground-truth-timeline.mjs";

export function buildGroundTruthModel(result) {
  if (result?.schemaVersion !== 3) {
    throw new TypeError("Report ground truth requires a schemaVersion 3 result.");
  }
  const dwellSeconds = finiteNonNegative(
    result?.run?.checkpointDwellSeconds,
    "run.checkpointDwellSeconds",
  );
  const route = buildReportRoute(result.route);
  const points = projectReportCheckIns(result, route);
  if (!points.length) {
    throw new TypeError("Report ground truth requires at least one check-in.");
  }
  const terminal = points.at(-1);
  if ((result.events ?? []).some(event => (
    event.type === "endpoint-hold-started"
    && event.checkpointId === terminal.checkpointId
  ))) {
    points[points.length - 1] = { ...terminal, endpointHold: true };
  }
  const stoppedAtMs = timestampMs(result.run.stoppedAt, "run.stoppedAt");
  const segments = buildTruthSegments(points, dwellSeconds * 1000, stoppedAtMs);
  const startMs = points[0].atMs;
  const endMs = Math.max(points.at(-1).atMs, segments.at(-1)?.endMs ?? startMs);
  return Object.freeze({
    dwellSeconds,
    startMs,
    endMs,
    totalRouteDistanceM: route.totalDistanceM,
    route,
    points: points.map(publicPoint),
    segments: segments.map(publicTruthSegment),
    routeInterval(startDistanceM, endDistanceM) {
      return route.interval(startDistanceM, endDistanceM);
    },
    at(value) {
      const atMs = playbackTime(value);
      if (!Number.isFinite(atMs) || atMs < startMs || atMs > endMs) return null;
      return truthAtTime(points, segments, route, atMs, endMs);
    },
  });
}

export const buildReportGroundTruth = buildGroundTruthModel;

function publicPoint(point) {
  return { ...point, at: new Date(point.atMs).toISOString() };
}

function playbackTime(value) {
  return value instanceof Date
    ? value.getTime()
    : (typeof value === "number" ? value : Date.parse(value));
}

function timestampMs(value, path) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${path}: must be an ISO timestamp`);
  return parsed;
}

function finiteNonNegative(value, path) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${path}: must be a non-negative finite number`);
  }
  return value;
}
