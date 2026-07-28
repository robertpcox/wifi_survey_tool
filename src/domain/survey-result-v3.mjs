import {
  ROUTE_REQUIRED_PATHS,
  validateRouteSnapshot,
} from "./route-snapshot-v3.mjs";
import {
  META_REQUIRED_PATHS,
  validateSurveyMeta,
} from "./survey-meta-v3.mjs";
import {
  expectArray,
  expectIso,
  expectNumber,
  expectRecord,
  expectString,
  requirePaths,
  secretValuePaths,
  validationResult,
} from "./validation.mjs";

const RUN_PATHS = [
  "resultId", "surveyId", "routeId", "routeHash", "customerId", "campusId",
  "sourceId", "device", "device.type", "device.os", "device.name",
  "device.clientIp", "band", "startedAt", "stoppedAt", "exportedAt",
  "completionStatus", "pollingIntervalMs", "checkpointDwellSeconds",
  "preflight", "preflight.verdict", "preflight.sampleId",
  "preflight.acknowledged",
];
const CAPTURE_PATHS = [
  "checkIns", "checkIns.0.checkpointId", "checkIns.0.at",
  "checkIns.0.groundTruth", "events", "events.0.type", "events.0.at",
  "polls", "polls.0.id", "polls.0.sourceId", "polls.0.sentAt",
  "polls.0.receivedAt", "polls.0.roundTripMs", "polls.0.httpStatus",
  "polls.0.success", "polls.0.normalized", "polls.0.raw", "polls.0.error",
];

export const RESULT_REQUIRED_PATHS = Object.freeze([
  "schemaVersion",
  ...META_REQUIRED_PATHS.map(path => `meta.${path}`),
  ...ROUTE_REQUIRED_PATHS.map(path => `route.${path}`),
  ...RUN_PATHS.map(path => `run.${path}`),
  ...CAPTURE_PATHS,
]);

export function validateSurveyResultV3(result) {
  const issues = [];
  requirePaths(result, RESULT_REQUIRED_PATHS, issues);
  if (result?.schemaVersion !== 3) issues.push("schemaVersion: must equal 3");
  issues.push(...validateSurveyMeta(result?.meta));
  issues.push(...validateRouteSnapshot(result?.route));
  validateRun(result?.run, issues);
  validateCaptures(result, issues);
  compareIdentity(result, issues);
  for (const path of secretValuePaths(result)) {
    issues.push(`${path}: serialized credential values are forbidden`);
  }
  return validationResult(issues);
}

function validateRun(run, issues) {
  expectRecord(run, "run", issues);
  for (const key of [
    "resultId", "surveyId", "routeId", "routeHash",
    "customerId", "campusId", "sourceId", "band",
  ]) {
    expectString(run?.[key], `run.${key}`, issues);
  }
  expectRecord(run?.device, "run.device", issues);
  for (const key of ["type", "os", "name", "clientIp"]) {
    expectString(run?.device?.[key], `run.device.${key}`, issues);
  }
  if (!["mobile", "laptop", "asset"].includes(run?.device?.type)) {
    issues.push("run.device.type: unsupported device type");
  }
  if (!["2.4", "5", "6", "mixed"].includes(run?.band)) {
    issues.push("run.band: unsupported wireless band");
  }
  for (const key of ["startedAt", "stoppedAt", "exportedAt"]) {
    expectIso(run?.[key], `run.${key}`, issues);
  }
  if (!["completed", "aborted"].includes(run?.completionStatus)) {
    issues.push("run.completionStatus: must be completed or aborted");
  }
  expectNumber(run?.pollingIntervalMs, "run.pollingIntervalMs", issues, 1);
  expectNumber(run?.checkpointDwellSeconds, "run.checkpointDwellSeconds", issues, 0);
  expectRecord(run?.preflight, "run.preflight", issues);
  if (!["green", "amber", "red"].includes(run?.preflight?.verdict)) {
    issues.push("run.preflight.verdict: unsupported verdict");
  }
  expectString(run?.preflight?.sampleId, "run.preflight.sampleId", issues);
  if (typeof run?.preflight?.acknowledged !== "boolean") {
    issues.push("run.preflight.acknowledged: must be a boolean");
  }
}

function validateCaptures(result, issues) {
  expectArray(result?.checkIns, "checkIns", issues, 1);
  expectArray(result?.events, "events", issues, 1);
  expectArray(result?.polls, "polls", issues, 1);
  for (const [index, checkIn] of (result?.checkIns || []).entries()) {
    expectString(checkIn?.checkpointId, `checkIns.${index}.checkpointId`, issues);
    expectIso(checkIn?.at, `checkIns.${index}.at`, issues);
    expectRecord(checkIn?.groundTruth, `checkIns.${index}.groundTruth`, issues);
  }
  for (const [index, event] of (result?.events || []).entries()) {
    expectString(event?.type, `events.${index}.type`, issues);
    expectIso(event?.at, `events.${index}.at`, issues);
  }
  for (const [index, poll] of (result?.polls || []).entries()) {
    validatePoll(poll, `polls.${index}`, issues);
  }
}

function validatePoll(poll, path, issues) {
  for (const key of ["id", "sourceId"]) expectString(poll?.[key], `${path}.${key}`, issues);
  for (const key of ["sentAt", "receivedAt"]) expectIso(poll?.[key], `${path}.${key}`, issues);
  expectNumber(poll?.roundTripMs, `${path}.roundTripMs`, issues, 0);
  expectNumber(poll?.httpStatus, `${path}.httpStatus`, issues, 100);
  if (typeof poll?.success !== "boolean") issues.push(`${path}.success: must be a boolean`);
  if (poll?.normalized !== null) expectRecord(poll?.normalized, `${path}.normalized`, issues);
  if (poll?.error !== null) expectString(poll?.error, `${path}.error`, issues);
}

function compareIdentity(result, issues) {
  const pairs = [
    ["surveyId", result?.meta?.surveyId],
    ["routeId", result?.meta?.route?.routeId],
    ["routeHash", result?.meta?.route?.hash],
    ["customerId", result?.meta?.customerId],
    ["campusId", result?.meta?.campusId],
    ["sourceId", result?.meta?.positionSourceId],
    ["pollingIntervalMs", result?.meta?.sourceConfig?.pollIntervalMs],
    ["checkpointDwellSeconds", result?.meta?.route?.checkpointDwellSeconds],
  ];
  for (const [key, expected] of pairs) {
    if (result?.run?.[key] !== expected) issues.push(`run.${key}: must match meta`);
  }
}
