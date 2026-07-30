// FEATURE:      Report Player comparison
// SURFACE:      compareReportResults(results, thresholds), reportDeviceLabel(result)
// WHY TOGETHER: Eligibility, baseline choice, labels, and deltas are one comparison contract.
// STATE:        None
// RULES:        Legacy blended metrics and fix-lane metrics share one baseline/delta treatment.
// PROVENANCE:   Step 5 report comparison contract

import { analyzeReportResult } from "./report-analysis.mjs";

export function compareReportResults(results, thresholds) {
  if (!Array.isArray(results) || results.length < 2) {
    throw new TypeError("Comparison requires at least two results.");
  }
  for (const result of results) {
    if (result?.run?.completionStatus !== "completed") {
      throw new TypeError(
        `Result ${result?.run?.resultId ?? "unknown"} is not completed.`,
      );
    }
  }
  const ordered = [...results].sort((left, right) => (
    Date.parse(left.run.startedAt) - Date.parse(right.run.startedAt)
    || left.run.resultId.localeCompare(right.run.resultId)
  ));
  const baseline = ordered[0];
  for (const result of ordered.slice(1)) {
    if (result.run.surveyId !== baseline.run.surveyId) {
      throw new TypeError("Comparison requires matching survey IDs.");
    }
    if (result.run.routeHash !== baseline.run.routeHash) {
      throw new TypeError("Comparison requires matching route hashes.");
    }
  }
  const analyzed = ordered.map(result => ({
    result,
    analysis: analyzeReportResult(result, thresholds),
  }));
  const baselineMetrics = comparableMetrics(analyzed[0].analysis);
  return {
    surveyId: baseline.run.surveyId,
    routeHash: baseline.run.routeHash,
    baselineResultId: baseline.run.resultId,
    thresholds: analyzed[0].analysis.thresholds,
    runs: analyzed.map(({ result, analysis }, index) => {
      const label = reportDeviceLabel(result);
      return {
        resultId: result.run.resultId,
        startedAt: result.run.startedAt,
        baseline: index === 0,
        label,
        device: {
          type: result.run.device.type,
          name: result.run.device.name,
          os: result.run.device.os,
          band: result.run.band,
        },
        operatorComment: result.run.operatorComment ?? null,
        thresholds: analysis.thresholds,
        values: metricValues(
          comparableMetrics(analysis),
          baselineMetrics,
          label,
        ),
      };
    }),
  };
}

function comparableMetrics(analysis) {
  const { accuracy, freshness, availability } = analysis.fixes;
  return {
    ...analysis.metrics,
    fixCount: accuracy.uniqueFixCount,
    fixMedianAccuracyM: accuracy.medianAccuracyM,
    fixP95AccuracyM: accuracy.p95AccuracyM,
    withinConfidencePercent: accuracy.withinConfidencePercent,
    fixIntervalMedianSeconds: freshness.medianFixIntervalSeconds,
    deliveryLatencyMedianSeconds: freshness.medianDeliveryLatencySeconds,
    noFreshFixPercent: freshness.noFreshFixPercent,
    medianLagBehindM: freshness.medianLagBehindM,
    noPositionSeconds: availability.noPositionSeconds,
    noPositionPercent: availability.noPositionPercent,
  };
}

export function reportDeviceLabel(result) {
  const device = result?.run?.device ?? {};
  return [
    device.type,
    device.name,
    device.os,
    `band ${result?.run?.band}`,
  ].join(" · ");
}

function metricValues(metrics, baseline, label) {
  return Object.fromEntries(Object.entries(metrics).map(([metric, absolute]) => [
    metric,
    {
      label,
      absolute,
      delta: Number.isFinite(absolute) && Number.isFinite(baseline[metric])
        ? rounded(absolute - baseline[metric])
        : null,
    },
  ]));
}

function rounded(value) {
  return Math.round(value * 1000) / 1000;
}
