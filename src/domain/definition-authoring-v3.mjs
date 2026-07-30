import { createRouteLegV3, generateRouteCheckpointsV3 } from "./creator-route-v3.mjs";
import { authoredCheckpointsV3, checkpointDwellDefaults } from "./checkpoint-dwell-v3.mjs";
import { capturedCheckpointsV3 } from "./captured-checkpoints-v3.mjs";
import {
  immutableDefinitionCopy,
  mutableDefinitionCopy as mutableCopy,
  sanitizedDefinitionCopy as sanitizedCopy,
} from "./definition-copy-v3.mjs";
import { estimateRouteDuration } from "./route-duration-v3.mjs";
import { canonicalRoutePlanV3, hashRoutePlanV3 } from "./route-hash-v3.mjs";
import { validateSurveyDefinitionV3 } from "./survey-definition-v3.mjs";
import { createSurveyIdV3 } from "./survey-meta-v3.mjs";
const META_FIELDS = [
  "surveyName", "customerId", "customerName", "campusId", "campusName",
  "timezone", "buildings", "zLevels", "zLevelNames", "positionSourceId",
  "authorNotes", "authorName", "sourceConfig", "credentialRequirements"];
export async function authorSurveyDefinitionV3(input, deps = {}) {
  const previous = input?.previousDefinition || null;
  if (previous) assertValidDefinition(previous);
  const metaInput = input?.meta || {};
  const stops = sanitizedCopy(input?.stops || []).map(stop => ({ ...stop, poiName: stop.poiName ?? null }));
  const suppliedLegs = sanitizedCopy(input?.legs || []);
  const suppliedCheckpoints = input?.checkpoints === undefined ? undefined
    : sanitizedCopy(input.checkpoints);
  assertOrderedLegs(stops, suppliedLegs);
  const spacing = numberAtLeast(input?.checkpointSpacingM, 0, "meta.route.checkpointSpacingM");
  const dwell = numberAtLeast(input?.checkpointDwellSeconds ?? 0, 0, "meta.route.checkpointDwellSeconds");
  const unchanged = previous && input?.routeId === previous.route.routeId
    && editablePlan(previous, stops, suppliedLegs,
      suppliedCheckpoints ?? previous.route.checkpoints, spacing, dwell);
  let route, routeSummary, surveyId, createdAt;
  if (unchanged) {
    route = mutableCopy(previous.route);
    routeSummary = mutableCopy(previous.meta.route);
    surveyId = previous.meta.surveyId;
    createdAt = previous.meta.createdAt;
  } else {
    const legs = suppliedLegs.map((leg, index) => createRouteLegV3(
      stops[index], stops[index + 1], leg.geometry ?? leg.coords, index,
    ));
    const checkpoints = input?.checkpointOrigin === "captured"
      ? capturedCheckpointsV3(stops, legs, suppliedCheckpoints, spacing)
      : authoredCheckpointsV3(
        generateRouteCheckpointsV3(stops, legs, spacing).checkpoints,
        suppliedCheckpoints,
      );
    const distanceM = legs.reduce((total, leg) => total + leg.distanceM, 0);
    const duration = estimateRouteDuration({
      distanceM, checkpoints, dwellSeconds: dwell,
    });
    const hash = await hashRoutePlanV3({
      stops, legs, checkpoints,
      checkpointSpacingM: spacing,
      checkpointDwellSeconds: dwell,
    }, deps.cryptoRef);
    const version = previous ? previous.route.version + 1 : 1;
    const routeId = input?.routeId ?? previous?.route.routeId;
    surveyId = createSurveyIdV3(deps.cryptoRef);
    route = {
      routeId, version, hash, stops, legs, checkpoints, totalDistanceM: distanceM,
    };
    routeSummary = {
      routeId, version, hash, distanceM,
      estimatedDurationSeconds: duration.totalSeconds,
      checkpointSpacingM: spacing, checkpointDwellSeconds: dwell,
    };
    createdAt = isoNow(deps.now);
  }
  const definition = { schemaVersion: 3,
    meta: buildMeta(metaInput, surveyId, routeSummary, createdAt), route };
  assertValidDefinition(definition);
  return immutableDefinitionCopy(definition);
}
export function importSurveyDefinitionV3(definition) {
  assertValidDefinition(definition);
  const previousDefinition = immutableDefinitionCopy(definition);
  const meta = mutableCopy(previousDefinition.meta);
  const dwellDefaults = checkpointDwellDefaults(
    previousDefinition.route.checkpoints,
    previousDefinition.meta.route.checkpointDwellSeconds,
  );
  delete meta.route;
  return {
    meta,
    routeId: previousDefinition.route.routeId,
    stops: mutableCopy(previousDefinition.route.stops),
    legs: mutableCopy(previousDefinition.route.legs),
    checkpointSpacingM: previousDefinition.meta.route.checkpointSpacingM,
    checkpointDwellSeconds: previousDefinition.meta.route.checkpointDwellSeconds,
    ...dwellDefaults,
    previousDefinition,
  };
}
export { immutableDefinitionCopy } from "./definition-copy-v3.mjs";
function editablePlan(previous, stops, legs, checkpoints, spacing, dwell) {
  const prior = {
    stops: previous.route.stops,
    legs: previous.route.legs,
    checkpoints: previous.route.checkpoints,
    checkpointSpacingM: previous.meta.route.checkpointSpacingM,
    checkpointDwellSeconds: previous.meta.route.checkpointDwellSeconds,
  };
  const current = { stops, legs, checkpoints, checkpointSpacingM: spacing,
    checkpointDwellSeconds: dwell };
  return canonicalRoutePlanV3(prior) === canonicalRoutePlanV3(current);
}
function assertOrderedLegs(stops, legs) {
  const expected = Math.max(0, stops.length - 1);
  if (legs.length !== expected) {
    throw new TypeError(`route.legs: must contain exactly ${expected} ordered leg(s)`);
  }
  legs.forEach((leg, index) => {
    if (leg.fromStopId !== stops[index]?.id) throw new TypeError(`route.legs.${index}.fromStopId: must match stop ${index}`);
    if (leg.toStopId !== stops[index + 1]?.id) throw new TypeError(`route.legs.${index}.toStopId: must match stop ${index + 1}`);
  });
}
function buildMeta(input, surveyId, route, createdAt) {
  const meta = {};
  for (const field of META_FIELDS) if (input[field] !== undefined) meta[field] = sanitizedCopy(input[field]);
  return { surveyId, ...meta, route, createdAt };
}
function assertValidDefinition(definition) {
  let result;
  try {
    result = validateSurveyDefinitionV3(definition);
  } catch (error) {
    throw new TypeError(`SurveyDefinitionV3 validation failed: ${error.message}`);
  }
  if (!result.valid) {
    const error = new TypeError(
      `SurveyDefinitionV3 validation failed:\n${result.errors.join("\n")}`,
    );
    error.errors = result.errors;
    throw error;
  }
}
function isoNow(now = () => new Date()) {
  const value = typeof now === "function" ? now() : now;
  return (value instanceof Date ? value : new Date(value)).toISOString();
}
function numberAtLeast(value, minimum, path) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) {
    throw new TypeError(`${path}: must be a finite number at least ${minimum}`);
  }
  return number;
}
