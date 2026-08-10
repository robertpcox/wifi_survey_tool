// FEATURE:      Report reviewed-exception coverage
// SURFACE:      buildReportCoverage(result, exceptions, truth), applyReportCoverage(truth, coverage)
// WHY TOGETHER: Reviewed anchors resolve to excluded time and distance without changing evidence.
// STATE:        None
// RULES:        Interval exclusions remove calculations only; playback keeps the raw result and truth.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import { buildReportGroundTruth } from "./report-ground-truth.mjs";
import { validateReviewedExceptionsV3 } from "./reviewed-exceptions-v3.mjs";

export function buildReportCoverage(result, exceptions = [], suppliedTruth = null) {
  const selected = exceptions.filter(item => item?.resultId === result?.run?.resultId);
  const validation = validateReviewedExceptionsV3(
    { schemaVersion: 3, exceptions: selected },
    new Map([[result?.run?.resultId, result]]),
  );
  if (!validation.valid) {
    throw new TypeError(`Invalid reviewed exceptions: ${validation.errors.join("; ")}`);
  }
  const truth = suppliedTruth ?? buildReportGroundTruth(result);
  const reviewedExceptions = selected.map(item => resolveException(item, result, truth));
  const intervals = mergeIntervals(reviewedExceptions.flatMap(item => (
    item.disposition === "include" ? [] : [[item.fromMs, item.toMs]]
  )));
  const runStartMs = Date.parse(result.run.startedAt);
  const runEndMs = Date.parse(result.run.stoppedAt);
  const excludedMs = intervals.reduce((total, interval) => (
    total + overlapMs(interval, [runStartMs, runEndMs])
  ), 0);
  return Object.freeze({
    reviewedExceptions,
    excludedSeconds: round(excludedMs / 1000),
    eligibleSeconds: round((runEndMs - runStartMs - excludedMs) / 1000),
    excludes(atMs) {
      return intervals.some(([fromMs, toMs]) => atMs >= fromMs && atMs < toMs);
    },
    includedRanges(fromMs, toMs) {
      return subtractIntervals(fromMs, toMs, intervals);
    },
  });
}

export function applyReportCoverage(truth, coverage) {
  return Object.freeze({
    ...truth,
    segments: truth.segments.flatMap(segment => (
      coverage.includedRanges(segment.startMs, segment.endMs)
        .map(([startMs, endMs]) => ({ ...segment, startMs, endMs }))
    )),
    at(value) {
      const atMs = value instanceof Date
        ? value.getTime()
        : (typeof value === "number" ? value : Date.parse(value));
      return coverage.excludes(atMs) ? null : truth.at(value);
    },
  });
}

function resolveException(exception, result, truth) {
  const points = new Map(truth.points.map(point => [point.checkpointId, point]));
  const from = points.get(exception.routeAnchor.fromCheckpointId);
  const to = points.get(exception.routeAnchor.toCheckpointId);
  const excludeRun = exception.disposition === "exclude-run";
  const fromMs = excludeRun ? Date.parse(result.run.startedAt) : from.atMs;
  const toMs = excludeRun ? Date.parse(result.run.stoppedAt) : to.atMs;
  return Object.freeze({
    ...exception,
    fromMs,
    toMs,
    fromAt: new Date(fromMs).toISOString(),
    toAt: new Date(toMs).toISOString(),
    excludedSeconds: round((toMs - fromMs) / 1000),
    excludedDistanceM: excludeRun
      ? round(truth.totalRouteDistanceM)
      : round(Math.abs(to.routeDistanceM - from.routeDistanceM)),
  });
}

function subtractIntervals(fromMs, toMs, intervals) {
  let ranges = [[fromMs, toMs]];
  for (const [excludedFrom, excludedTo] of intervals) {
    ranges = ranges.flatMap(([from, to]) => [
      [from, Math.min(to, excludedFrom)],
      [Math.max(from, excludedTo), to],
    ].filter(([start, end]) => end > start));
  }
  return ranges;
}

function mergeIntervals(intervals) {
  const merged = [];
  for (const [fromMs, toMs] of [...intervals].sort((a, b) => a[0] - b[0])) {
    const prior = merged.at(-1);
    if (prior && fromMs <= prior[1]) prior[1] = Math.max(prior[1], toMs);
    else merged.push([fromMs, toMs]);
  }
  return merged;
}

function overlapMs([leftStart, leftEnd], [rightStart, rightEnd]) {
  return Math.max(0, Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart));
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
