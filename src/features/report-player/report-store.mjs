// FEATURE:      Report Player shared context
// SURFACE:      createReportPlayerStore(options)
// WHY TOGETHER: Result, meta, thresholds, analysis, comparison, and active view share one lifecycle.
// STATE:        One result reference, one analysis, comparison results, thresholds, and subscribers
// RULES:        View switches never reload, reparse, or reanalyze the result.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import {
  analyzeReportResult,
  REPORT_THRESHOLDS,
} from "../../domain/report-analysis.mjs";
import { compareReportResults } from "../../domain/report-comparison.mjs";

export function createReportPlayerStore({
  analyze = analyzeReportResult,
  compare = compareReportResults,
} = {}) {
  let result = null;
  let meta = null;
  let manifest = null;
  let analysis = null;
  let comparisonResults = [];
  let comparison = null;
  let thresholds = { ...REPORT_THRESHOLDS };
  let view = "analysis";
  const subscribers = new Set();

  function load(payload) {
    result = payload.result;
    meta = result.meta;
    manifest = payload.manifest ?? null;
    comparisonResults = [];
    comparison = null;
    analysis = analyze(result, thresholds);
    notify();
    return snapshot();
  }

  function setThresholds(next) {
    thresholds = {
      stickySeconds: number(next.stickySeconds, thresholds.stickySeconds),
      accuracyM: number(next.accuracyM, thresholds.accuracyM),
      noPositionSeconds: number(
        next.noPositionSeconds,
        thresholds.noPositionSeconds,
      ),
    };
    analysis = analyze(result, thresholds);
    comparison = comparisonResults.length
      ? compare([result, ...comparisonResults], thresholds)
      : null;
    notify();
    return snapshot();
  }

  function addComparison(candidate) {
    const existing = comparisonResults
      .filter(item => item.run.resultId !== candidate.run.resultId);
    comparisonResults = [...existing, candidate];
    comparison = compare([result, ...comparisonResults], thresholds);
    notify();
    return comparison;
  }

  function removeComparison(resultId) {
    comparisonResults = comparisonResults
      .filter(item => item.run.resultId !== resultId);
    comparison = comparisonResults.length
      ? compare([result, ...comparisonResults], thresholds)
      : null;
    notify();
  }

  function setView(next) {
    if (!["analysis", "playback"].includes(next)) {
      throw new Error("Unknown Report Player view");
    }
    view = next;
    notify();
    return snapshot();
  }

  function snapshot() {
    return Object.freeze({
      result,
      meta,
      manifest,
      analysis,
      comparison,
      comparisonResults: [...comparisonResults],
      thresholds: { ...thresholds },
      view,
    });
  }

  function subscribe(listener) {
    subscribers.add(listener);
    return () => subscribers.delete(listener);
  }

  function notify() {
    const state = snapshot();
    subscribers.forEach(listener => listener(state));
  }

  return Object.freeze({
    addComparison,
    load,
    removeComparison,
    setThresholds,
    setView,
    snapshot,
    subscribe,
  });
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}
