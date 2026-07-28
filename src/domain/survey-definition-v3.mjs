import {
  ROUTE_REQUIRED_PATHS,
  validateRouteSnapshot,
} from "./route-snapshot-v3.mjs";
import {
  META_REQUIRED_PATHS,
  validateSurveyMeta,
} from "./survey-meta-v3.mjs";
import {
  requirePaths,
  secretValuePaths,
  validationResult,
} from "./validation.mjs";

export const DEFINITION_REQUIRED_PATHS = Object.freeze([
  "schemaVersion",
  ...META_REQUIRED_PATHS.map(path => `meta.${path}`),
  ...ROUTE_REQUIRED_PATHS.map(path => `route.${path}`),
]);

export function validateSurveyDefinitionV3(definition) {
  const issues = [];
  requirePaths(definition, DEFINITION_REQUIRED_PATHS, issues);
  if (definition?.schemaVersion !== 3) {
    issues.push("schemaVersion: must equal 3");
  }
  issues.push(...validateSurveyMeta(definition?.meta));
  issues.push(...validateRouteSnapshot(definition?.route));
  for (const secretPath of secretValuePaths(definition?.route, "route")) {
    issues.push(`${secretPath}: serialized credential values are forbidden`);
  }
  if (definition?.meta && definition?.route) {
    compareRouteIdentity(definition.meta.route, definition.route, issues);
    compareRouteFloors(definition.meta, definition.route, issues);
  }
  return validationResult(issues);
}

function compareRouteIdentity(summary, route, issues) {
  for (const [summaryKey, routeKey] of [
    ["routeId", "routeId"],
    ["version", "version"],
    ["hash", "hash"],
    ["distanceM", "totalDistanceM"],
  ]) {
    if (summary?.[summaryKey] !== route?.[routeKey]) {
      issues.push(`meta.route.${summaryKey}: must match route.${routeKey}`);
    }
  }
}

function compareRouteFloors(meta, route, issues) {
  const levels = new Set(
    Array.isArray(meta?.zLevels) ? meta.zLevels.filter(Number.isFinite) : [],
  );
  const locations = [];
  if (Array.isArray(route?.stops)) {
    route.stops.forEach((stop, index) => {
      locations.push([stop?.z, `route.stops.${index}.z`]);
    });
  }
  if (Array.isArray(route?.legs)) {
    route.legs.forEach((leg, legIndex) => {
      if (!Array.isArray(leg?.geometry)) return;
      leg.geometry.forEach((point, pointIndex) => {
        locations.push([
          point?.z,
          `route.legs.${legIndex}.geometry.${pointIndex}.z`,
        ]);
      });
    });
  }
  if (Array.isArray(route?.checkpoints)) {
    route.checkpoints.forEach((checkpoint, index) => {
      locations.push([checkpoint?.z, `route.checkpoints.${index}.z`]);
    });
  }
  for (const [z, path] of locations) {
    if (Number.isFinite(z) && !levels.has(z)) {
      issues.push(`${path}: must be listed in meta.zLevels`);
    }
  }
}
