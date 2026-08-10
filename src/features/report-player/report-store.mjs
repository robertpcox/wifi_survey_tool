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
import { buildConcernSegments } from "../../domain/report-concern-segments.mjs";

export function createReportPlayerStore({
  analyze = analyzeReportResult,
  compare = compareReportResults,
} = {}) {
  let result = null;
  let meta = null;
  let manifest = null;
  let exceptions = [];
  let analysis = null;
  let comparisonResults = [];
  let comparison = null;
  let thresholds = { ...REPORT_THRESHOLDS };
  let view = "analysis";
  let consolidated = false;
  const subscribers = new Set();

  function load(payload) {
    result = payload.result;
    meta = result.meta;
    manifest = payload.manifest ?? null;
    exceptions = payload.exceptions ?? [];
    comparisonResults = [];
    comparison = null;
    view = ["analysis", "playback", "overview"].includes(payload.initialView)
      ? payload.initialView
      : "analysis";
    consolidated = payload.consolidated === true;
    analysis = analyzed();
    notify();
    return snapshot();
  }

  function analyzed() {
    const value = analyze(result, thresholds, exceptions);
    return { ...value, concernSegments: buildConcernSegments(result, value) };
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
    analysis = analyzed();
    comparison = comparisonResults.length
      ? compare([{ result, exceptions }, ...comparisonResults], thresholds)
      : null;
    notify();
    return snapshot();
  }

  function addComparison(candidate, candidateExceptions = []) {
    const existing = comparisonResults
      .filter(item => item.result.run.resultId !== candidate.run.resultId);
    comparisonResults = [
      ...existing,
      { result: candidate, exceptions: candidateExceptions },
    ];
    comparison = compare([{ result, exceptions }, ...comparisonResults], thresholds);
    notify();
    return comparison;
  }

  function removeComparison(resultId) {
    comparisonResults = comparisonResults
      .filter(item => item.result.run.resultId !== resultId);
    comparison = comparisonResults.length
      ? compare([{ result, exceptions }, ...comparisonResults], thresholds)
      : null;
    notify();
  }

  function setView(next) {
    if (!["analysis", "playback", "overview"].includes(next)) {
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
      exceptions: [...exceptions],
      analysis,
      comparison,
      comparisonResults: comparisonResults.map(item => item.result),
      thresholds: { ...thresholds },
      view,
      consolidated,
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
