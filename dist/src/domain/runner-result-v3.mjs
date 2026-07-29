import { validateSurveyResultV3 } from "./survey-result-v3.mjs";

export function buildSurveyResultV3(options) {
  const {
    definition,
    entry,
    preflight,
    polls,
    checkIns,
    events,
    notes = [],
    startedAt,
    stoppedAt,
    exportedAt,
    completionStatus,
    operatorComment = null,
    resultId,
  } = options;
  const result = {
    schemaVersion: 3,
    meta: structuredClone(definition.meta),
    route: structuredClone(definition.route),
    run: {
      resultId,
      surveyId: definition.meta.surveyId,
      routeId: definition.meta.route.routeId,
      routeHash: definition.meta.route.hash,
      customerId: definition.meta.customerId,
      campusId: definition.meta.campusId,
      sourceId: definition.meta.positionSourceId,
      device: {
        type: entry.deviceType,
        os: entry.deviceOs,
        name: entry.deviceName,
        clientIp: entry.clientIp,
      },
      band: entry.band,
      operatorComment: cleanComment(operatorComment),
      startedAt,
      stoppedAt,
      exportedAt,
      completionStatus,
      pollingIntervalMs: definition.meta.sourceConfig.pollIntervalMs,
      checkpointDwellSeconds: definition.meta.route.checkpointDwellSeconds,
      preflight: structuredClone(preflight),
    },
    checkIns: structuredClone(checkIns),
    events: structuredClone(events),
    notes: structuredClone(notes),
    polls: structuredClone(polls),
  };
  const validation = validateSurveyResultV3(result);
  if (!validation.valid) {
    throw new Error(`Runner result is invalid:\n${validation.errors.join("\n")}`);
  }
  return result;
}

export function resultFilename(result) {
  const timestamp = result.run.exportedAt
    .replace(/\.\d{3}Z$/, "Z")
    .replaceAll(":", "-");
  return [
    result.run.customerId,
    result.run.campusId,
    result.run.surveyId,
    timestamp,
  ].join("__") + ".result.v3.json";
}

function cleanComment(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
