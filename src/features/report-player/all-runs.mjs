// FEATURE:      Report Player all-runs comparison
// SURFACE:      createAllRunsLoader, bindAllRunsAction, renderAllRunsSection, allRunsRow
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
  const failures = new Map();
  let loaded = false;
  return Object.freeze({
    async load(onProgress = () => {}) {
      let done = 0;
      for (const entry of entries) {
        if (!cache.has(entry.resultId)) {
          try {
            const result = assertResult(await manifestSource.result(entry.path));
            cache.set(entry.resultId, {
              result,
              entry,
              exceptions: entry.reviewedExceptions ?? [],
            });
            failures.delete(entry.resultId);
          } catch (error) {
            failures.set(entry.resultId, error);
          }
        }
        onProgress(done += 1, entries.length);
      }
      loaded = true;
    },
    records() { return [...cache.values()]; },
    results() { return [...cache.values()].map(record => record.result); },
    rows(
      currentResult,
      thresholds,
      analyze = analyzeReportResult,
      currentExceptions = [],
    ) {
      return [currentResult, ...cache.values().map(record => record.result)]
        .filter(Boolean)
        .map(result => {
          const exceptions = result === currentResult ? currentExceptions
            : cache.get(result.run.resultId)?.exceptions ?? [];
          return allRunsRow(
            result,
            analyze(result, thresholds, exceptions),
            currentResult,
          );
        })
        .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
    },
    get loaded() { return loaded; },
    get entryCount() { return entries.length; },
    get failureCount() { return failures.size; },
    get failureIds() { return [...failures.keys()]; },
    get loadedCount() { return cache.size; },
  });
}

export function bindAllRunsAction(root, { loader, status, refresh }) {
  root.querySelector("[data-load-all-runs]")?.addEventListener("click", async () => {
    status.textContent = "Loading campus runs…";
    try {
      await loader.load();
      status.textContent = "Campus runs loaded · scalars use the live thresholds.";
    } catch (error) { status.textContent = error.message; }
    refresh();
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
