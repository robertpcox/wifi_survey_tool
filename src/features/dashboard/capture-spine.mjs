// FEATURE:      Dashboard capture converter
// SURFACE:      captureSpineChoices, spineRunLabel, parseSpineResult, parseCaptureRecords
// WHY TOGETHER: Deployed-run choices and uploaded-run parsing are the two co-equal spine sources.
// STATE:        None
// RULES:        Uploaded spines pass the same v3 validation as deployed runs; errors stay plain.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import { validateSurveyResultV3 } from "../../domain/survey-result-v3.mjs";

export function captureSpineChoices(manifest) {
  const surveyNames = new Map(
    (manifest?.surveys ?? []).map(survey => [survey.surveyId, survey.surveyName]),
  );
  return (manifest?.results ?? [])
    .filter(result => result.completionStatus === "completed" && result.path)
    .sort((left, right) => right.exportedAt.localeCompare(left.exportedAt))
    .map(result => ({
      resultId: result.resultId,
      path: result.path,
      label: [
        surveyNames.get(result.surveyId) ?? result.surveyId,
        result.device?.name ?? "Unnamed device",
        result.exportedAt,
      ].join(" · "),
    }));
}

export function spineRunLabel(spine) {
  return [
    spine?.meta?.surveyName ?? spine?.run?.surveyId ?? "Unknown survey",
    spine?.run?.device?.name ?? "Unknown device",
    spine?.run?.exportedAt ?? "unknown export time",
  ].join(" · ");
}

export function parseSpineResult(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Spine file is not valid JSON.");
  }
  const validation = validateSurveyResultV3(parsed);
  if (!validation.valid) {
    throw new Error("Uploaded file is not a valid v3 result.");
  }
  return parsed;
}

export function parseCaptureRecords(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Capture file is not valid JSON.");
  }
}
