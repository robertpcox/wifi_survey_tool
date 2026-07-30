// FEATURE:      Report Player result loading
// SURFACE:      resultSelectionFromUrl, loadSelectedResult, readUploadedResult, comparisonEntries, campusRunEntries
// WHY TOGETHER: Manifest resolution, parsing, and v3 validation form one trusted load boundary.
// STATE:        None
// RULES:        Resolve URL IDs through generated manifests and accept only defensible v3 coordinates.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { readJsonFile } from "../../adapters/files.mjs";
import { validateSurveyResultV3 } from "../../domain/survey-result-v3.mjs";

export function resultSelectionFromUrl(url) {
  const parsed = url instanceof URL ? url : new URL(url, import.meta.url);
  return Object.freeze({
    customerId: parsed.searchParams.get("customer_id")?.trim() || null,
    resultId: parsed.searchParams.get("result_id")?.trim() || null,
  });
}

export async function loadSelectedResult({ selection, manifestSource }) {
  if (!selection.customerId || !selection.resultId) {
    throw new Error("Choose a result from a customer dashboard or upload a v3 result file");
  }
  const manifest = await manifestSource.customer(selection.customerId);
  if (manifest.customerId !== selection.customerId) {
    throw new Error("Customer manifest does not match the requested customer");
  }
  const entry = manifest.results.find(item => item.resultId === selection.resultId);
  if (!entry) throw new Error("The selected result is not in this customer manifest");
  const result = assertReportResult(await manifestSource.result(entry.path));
  if (
    result.run.resultId !== entry.resultId
    || result.run.customerId !== manifest.customerId
  ) {
    throw new Error("Loaded result identity does not match its manifest");
  }
  return Object.freeze({ result, manifest, entry });
}

export async function readUploadedResult(file) {
  return assertReportResult(await readJsonFile(file));
}

export function assertReportResult(result) {
  const validation = validateSurveyResultV3(result);
  if (!validation.valid) {
    throw new Error(`Invalid v3 result: ${validation.errors.join("; ")}`);
  }
  for (const [index, checkIn] of result.checkIns.entries()) {
    assertPosition(checkIn.groundTruth, `checkIns.${index}.groundTruth`);
  }
  for (const [index, poll] of result.polls.entries()) {
    if (poll.normalized !== null) {
      assertPosition(poll.normalized, `polls.${index}.normalized`);
      if (poll.normalized.fixTime && !finiteTime(poll.normalized.fixTime)) {
        throw new Error(`polls.${index}.normalized.fixTime must be an ISO timestamp`);
      }
    }
  }
  return result;
}

export function comparisonEntries(manifest, result) {
  return manifest.results.filter(entry => (
    entry.resultId !== result.run.resultId
    && entry.completionStatus === "completed"
    && entry.surveyId === result.run.surveyId
    && entry.routeHash === result.run.routeHash
  ));
}

export function campusRunEntries(manifest, result) {
  return (manifest?.results ?? []).filter(entry => (
    entry.resultId !== result.run.resultId
    && entry.completionStatus === "completed"
    && entry.campusId === result.run.campusId
  )).sort((left, right) => right.exportedAt.localeCompare(left.exportedAt));
}

function assertPosition(position, path) {
  for (const key of ["lng", "lat", "z"]) {
    if (!Number.isFinite(position?.[key])) {
      throw new Error(`${path}.${key} must be finite`);
    }
  }
}

function finiteTime(value) {
  return Number.isFinite(Date.parse(value));
}
