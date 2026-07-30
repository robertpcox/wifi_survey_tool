const REQUIRED_TEXT = Object.freeze([
  "surveyName",
  "customerId",
  "customerName",
  "campusId",
  "campusName",
  "timezone",
  "routeId",
  "positionSourceId",
  "configId",
  "proxyBase",
]);

export function parseCreatorFields(fields, coverage = {}) {
  for (const name of REQUIRED_TEXT) requiredText(fields[name], name);
  const plan = parseCreatorPlanFields(fields);
  return {
    meta: {
      surveyName: fields.surveyName.trim(),
      customerId: fields.customerId.trim(),
      customerName: fields.customerName.trim(),
      campusId: fields.campusId.trim(),
      campusName: fields.campusName.trim(),
      timezone: fields.timezone.trim(),
      buildings: structuredClone(coverage.buildings ?? []),
      zLevels: structuredClone(coverage.zLevels ?? []),
      zLevelNames: structuredClone(coverage.zLevelNames ?? {}),
      positionSourceId: fields.positionSourceId.trim(),
      authorNotes: optional(fields.authorNotes),
      sourceConfig: {
        configId: fields.configId.trim(),
        pollIntervalMs: positive(fields.pollIntervalMs, "pollIntervalMs"),
        proxyBase: fields.proxyBase.trim(),
      },
      credentialRequirements: {
        mapAccess: Boolean(fields.needsMapAccess),
        appId: true,
        appKey: true,
        clientIp: true,
      },
      authorName: optional(fields.authorName),
    },
    routeId: fields.routeId.trim(),
    plan,
  };
}

export function parseCreatorPlanFields(fields) {
  return {
    spacingM: positive(fields.spacingM, "spacingM"),
    midLegDwellSeconds: nonNegative(
      fields.midLegDwellSeconds,
      "midLegDwellSeconds",
    ),
    legEndDwellSeconds: nonNegative(
      fields.legEndDwellSeconds,
      "legEndDwellSeconds",
    ),
  };
}

export function fieldsFromDefinition(definition) {
  const { meta, route } = definition;
  const dwellDefaults = checkpointDwellDefaults(
    route.checkpoints,
    meta.route.checkpointDwellSeconds,
  );
  return {
    surveyName: meta.surveyName,
    customerId: meta.customerId,
    customerName: meta.customerName,
    campusId: meta.campusId,
    campusName: meta.campusName,
    timezone: meta.timezone,
    routeId: route.routeId,
    positionSourceId: meta.positionSourceId,
    configId: meta.sourceConfig.configId,
    pollIntervalMs: meta.sourceConfig.pollIntervalMs,
    proxyBase: meta.sourceConfig.proxyBase,
    needsMapAccess: meta.credentialRequirements.mapAccess,
    needsAppId: meta.credentialRequirements.appId,
    needsAppKey: meta.credentialRequirements.appKey,
    needsClientIp: meta.credentialRequirements.clientIp,
    authorName: meta.authorName ?? "",
    authorNotes: meta.authorNotes ?? "",
    spacingM: meta.route.checkpointSpacingM,
    ...dwellDefaults,
  };
}

export function assertCreatorCampus(meta, configuredCampusId) {
  const expected = typeof configuredCampusId === "function"
    ? configuredCampusId()
    : configuredCampusId;
  if (expected == null) {
    throw new TypeError("Engage MazeMap before authoring the route");
  }
  if (String(meta.campusId) !== String(expected)) {
    throw new TypeError(
      `campusId: must match the engaged map campus ${expected}`,
    );
  }
}

function requiredText(value, name) {
  if (typeof value !== "string" || !value.trim()) {
    throw new TypeError(`${name}: is required`);
  }
}

function positive(value, name) {
  const number = Number(value);
  if (!(number > 0)) throw new TypeError(`${name}: must be greater than zero`);
  return number;
}

function nonNegative(value, name) {
  const number = Number(value);
  if (!(number >= 0)) throw new TypeError(`${name}: must be zero or greater`);
  return number;
}

function optional(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
import { checkpointDwellDefaults } from "../../domain/checkpoint-dwell-v3.mjs";
