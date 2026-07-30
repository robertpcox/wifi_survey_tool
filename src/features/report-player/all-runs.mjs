// FEATURE:      Report Player all-runs comparison
// SURFACE:      createAllRunsLoader(options), renderAllRunsSection(allRuns), allRunsRow(result, analysis)
// WHY TOGETHER: Lazy campus-run loading and lane-scalar rows form one route-free comparison.
// STATE:        Fetched campus results cached by result id
// RULES:        Nothing fetches until asked; run-level lane scalars need no route alignment.
// PROVENANCE:   NDH one-off dynamic runs must still compare against the campus

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { reportDeviceLabel } from "../../domain/report-comparison.mjs";
import { esc } from "../../shared/format.mjs";

const COLUMNS = Object.freeze([
  ["fixCount", "Fixes", value => value],
  ["medianAccuracyM", "Median err (m)", one],
  ["p95AccuracyM", "P95 err (m)", one],
  ["withinConfidencePercent", "In conf (%)", one],
  ["fixIntervalMedianSeconds", "Fix every (s)", one],
  ["medianLagBehindM", "Lag med (m)", one],
  ["noFreshFixPercent", "No fresh fix (%)", one],
  ["noPositionPercent", "No position (%)", one],
]);

export function createAllRunsLoader({ entries, manifestSource, assertResult }) {
  const cache = new Map();
  let loaded = false;
  return Object.freeze({
    async load() {
      for (const entry of entries) {
        if (!cache.has(entry.resultId)) {
          cache.set(
            entry.resultId,
            assertResult(await manifestSource.result(entry.path)),
          );
        }
      }
      loaded = true;
    },
    rows(currentResult, thresholds, analyze = analyzeReportResult) {
      return [currentResult, ...cache.values()]
        .filter(Boolean)
        .map(result => allRunsRow(result, analyze(result, thresholds), currentResult))
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    },
    get loaded() { return loaded; },
    get entryCount() { return entries.length; },
  });
}

export function allRunsRow(result, analysis, currentResult = null) {
  const { accuracy, freshness, availability } = analysis.fixes;
  return {
    resultId: result.run.resultId,
    current: result.run.resultId === currentResult?.run?.resultId,
    label: reportDeviceLabel(result),
    surveyName: result.meta.surveyName,
    startedAt: result.run.startedAt,
    fixCount: accuracy.uniqueFixCount,
    medianAccuracyM: accuracy.medianAccuracyM,
    p95AccuracyM: accuracy.p95AccuracyM,
    withinConfidencePercent: accuracy.withinConfidencePercent,
    fixIntervalMedianSeconds: freshness.medianFixIntervalSeconds,
    medianLagBehindM: freshness.medianLagBehindM,
    noFreshFixPercent: freshness.noFreshFixPercent,
    noPositionPercent: availability.noPositionPercent,
  };
}

export function renderAllRunsSection(allRuns) {
  if (!allRuns) return "";
  const heading = `<div class="section-heading all-runs-heading">
    <div><h3>All campus runs</h3>
      <p>Run-level lane scalars · no route alignment needed.</p></div>
  </div>`;
  if (!allRuns.loaded) {
    return `<div class="all-runs">${heading}${allRuns.entryCount
      ? `<button type="button" data-load-all-runs>
          Load all ${esc(allRuns.entryCount + 1)} campus runs</button>`
      : '<p class="empty-state">No other deployed campus runs are available.</p>'}
    </div>`;
  }
  return `<div class="all-runs">${heading}
    <div class="comparison-table-wrap">
      <table>
        <thead><tr><th>Run · newest first</th>${COLUMNS.map(([, label]) => `
          <th>${esc(label)}</th>`).join("")}</tr></thead>
        <tbody>${allRuns.rows.map(row => `
          <tr${row.current ? ' class="is-current-run"' : ""}>
            <th>${esc(row.surveyName)}<small>${esc(row.label)}
              · ${esc(row.startedAt)}${row.current ? " · this run" : ""}</small></th>
            ${COLUMNS.map(([key, , format]) => `
            <td>${esc(finite(row[key]) ? format(row[key]) : "—")}</td>`).join("")}
          </tr>`).join("")}</tbody>
      </table>
    </div>
  </div>`;
}

function one(value) {
  return Number(value).toFixed(1);
}

function finite(value) {
  return Number.isFinite(value);
}
