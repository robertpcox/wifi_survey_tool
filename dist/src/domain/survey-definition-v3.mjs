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
  if (definition?.meta && definition?.route) {
    compareRouteIdentity(definition.meta.route, definition.route, issues);
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
