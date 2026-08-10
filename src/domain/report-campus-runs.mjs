// FEATURE:      Consolidated run scalars
// SURFACE:      campusRunSummaries(runs), campusRunMetrics(runs)
// WHY TOGETHER: Public run rows and their aggregate KPIs share one scalar contract.
// STATE:        None
// RULES:        Moving metrics remain separate from stationary room outcomes.
// PROVENANCE:   Campus-level consolidated report

import { reportQuantile } from "./report-samples.mjs";

export function campusRunSummaries(runs) {
  return runs.map(({ result, analysis }) => ({
    resultId: result.run.resultId,
    surveyName: result.meta.surveyName,
    startedAt: result.run.startedAt,
    deviceName: result.run.device?.name ?? "Unknown device",
    stickySeconds: analysis.metrics.stickySeconds,
    medianLagBehindM: positiveLagMedian(analysis),
    noPositionPercent: analysis.fixes.availability.noPositionPercent,
  })).sort((left, right) => right.startedAt.localeCompare(left.startedAt));
}

export function campusRunMetrics(runs) {
  const values = key => runs.map(item => key(item.analysis))
    .filter(Number.isFinite);
  return {
    totalStickySeconds: round(values(item => item.metrics.stickySeconds)
      .reduce((total, value) => total + value, 0)),
    medianRunLagBehindM: round(reportQuantile(
      runs.map(item => positiveLagMedian(item.analysis)).filter(Number.isFinite), 0.5,
    )),
    medianRunNoPositionPercent: round(reportQuantile(
      values(item => item.fixes.availability.noPositionPercent), 0.5,
    )),
  };
}

function positiveLagMedian(analysis) {
  const lags = (analysis?.fixes?.lagSeries ?? [])
    .filter(item => item.moving && Number(item.lagBehindM) > 0)
    .map(item => Number(item.lagBehindM));
  return round(reportQuantile(lags, 0.5));
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
