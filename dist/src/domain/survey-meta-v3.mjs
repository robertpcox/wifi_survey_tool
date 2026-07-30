import {
  expectArray,
  expectIso,
  expectNumber,
  expectRecord,
  expectString,
  requirePaths,
  secretValuePaths,
} from "./validation.mjs";

export const META_REQUIRED_PATHS = Object.freeze([
  "surveyId", "surveyName", "customerId", "customerName",
  "campusId", "campusName", "timezone",
  "buildings", "buildings.0.id", "buildings.0.name",
  "zLevels", "zLevelNames", "positionSourceId",
  "sourceConfig", "sourceConfig.configId", "sourceConfig.pollIntervalMs",
  "sourceConfig.proxyBase", "credentialRequirements",
  "credentialRequirements.mapAccess", "credentialRequirements.appId",
  "credentialRequirements.appKey", "credentialRequirements.clientIp",
  "route", "route.routeId", "route.version", "route.hash",
  "route.distanceM", "route.estimatedDurationSeconds",
  "route.checkpointSpacingM", "route.checkpointDwellSeconds",
  "createdAt",
]);

const STRING_PATHS = [
  "surveyId", "surveyName", "customerId", "customerName",
  "campusId", "campusName", "timezone", "positionSourceId",
];
const RFC_4122_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createSurveyIdV3(cryptoRef = globalThis.crypto) {
  if (typeof cryptoRef?.randomUUID !== "function") {
    throw new TypeError("cryptoRef.randomUUID: is required for survey ID generation");
  }
  return cryptoRef.randomUUID();
}

export function validateSurveyMeta(meta, path = "meta") {
  const issues = [];
  expectRecord(meta, path, issues);
  if (meta === null || typeof meta !== "object") return issues;
  requirePaths(meta, META_REQUIRED_PATHS, issues, path);
  for (const key of STRING_PATHS) expectString(meta[key], `${path}.${key}`, issues);
  if (typeof meta.surveyId === "string" && meta.surveyId.trim()
      && !RFC_4122_UUID.test(meta.surveyId)) {
    issues.push(`${path}.surveyId: must be an RFC 4122 UUID`);
  }
  expectArray(meta.buildings, `${path}.buildings`, issues, 1);
  for (const [index, building] of arrayValue(meta.buildings).entries()) {
    expectString(building?.id, `${path}.buildings.${index}.id`, issues);
    expectString(building?.name, `${path}.buildings.${index}.name`, issues);
  }
  expectArray(meta.zLevels, `${path}.zLevels`, issues, 1);
  expectRecord(meta.zLevelNames, `${path}.zLevelNames`, issues);
  for (const level of arrayValue(meta.zLevels)) {
    expectNumber(level, `${path}.zLevels`, issues);
    expectString(meta.zLevelNames?.[String(level)], `${path}.zLevelNames.${level}`, issues);
  }
  if (meta.positionSourceId !== "mazemap-cloud") {
    issues.push(`${path}.positionSourceId: unsupported source`);
  }
  validateSourceConfig(meta.sourceConfig, `${path}.sourceConfig`, issues);
  validateCredentialRequirements(
    meta.credentialRequirements,
    `${path}.credentialRequirements`,
    issues,
  );
  validateRouteSummary(meta.route, `${path}.route`, issues);
  if (meta.authorNotes !== undefined) {
    expectString(meta.authorNotes, `${path}.authorNotes`, issues, true);
  }
  if (meta.authorName !== undefined) {
    expectString(meta.authorName, `${path}.authorName`, issues, true);
  }
  expectIso(meta.createdAt, `${path}.createdAt`, issues);
  for (const secretPath of secretValuePaths(meta, path)) {
    issues.push(`${secretPath}: serialized credential values are forbidden`);
  }
  return issues;
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function validateSourceConfig(config, path, issues) {
  expectRecord(config, path, issues);
  expectString(config?.configId, `${path}.configId`, issues);
  expectNumber(config?.pollIntervalMs, `${path}.pollIntervalMs`, issues, 1);
  expectString(config?.proxyBase, `${path}.proxyBase`, issues);
}

function validateCredentialRequirements(requirements, path, issues) {
  expectRecord(requirements, path, issues);
  for (const key of ["mapAccess", "appId", "appKey", "clientIp"]) {
    if (typeof requirements?.[key] !== "boolean") {
      issues.push(`${path}.${key}: must be a boolean`);
    }
  }
}

function validateRouteSummary(route, path, issues) {
  expectRecord(route, path, issues);
  expectString(route?.routeId, `${path}.routeId`, issues);
  expectNumber(route?.version, `${path}.version`, issues, 1);
  expectString(route?.hash, `${path}.hash`, issues);
  for (const key of [
    "distanceM", "estimatedDurationSeconds",
    "checkpointSpacingM", "checkpointDwellSeconds",
  ]) {
    expectNumber(route?.[key], `${path}.${key}`, issues, 0);
  }
}
