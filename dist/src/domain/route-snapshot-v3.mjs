import {
  expectArray,
  expectIso,
  expectNumber,
  expectRecord,
  expectString,
  requirePaths,
} from "./validation.mjs";
import { validateRouteIntegrityV3 } from "./route-integrity-v3.mjs";

export const ROUTE_REQUIRED_PATHS = Object.freeze([
  "routeId", "version", "hash", "stops", "stops.0.id", "stops.0.name",
  "stops.0.lng", "stops.0.lat", "stops.0.z", "stops.0.poiId",
  "stops.0.poiName", "stops.0.locationType", "stops.0.provenance",
  "legs", "legs.0.id", "legs.0.fromStopId", "legs.0.toStopId",
  "legs.0.distanceM", "legs.0.geometry",
  "checkpoints", "checkpoints.0.id", "checkpoints.0.sequence",
  "checkpoints.0.type", "checkpoints.0.lng", "checkpoints.0.lat",
  "checkpoints.0.z", "checkpoints.0.stopId", "checkpoints.0.legId",
  "checkpoints.0.spacingBasisM", "totalDistanceM",
]);

export function validateRouteSnapshot(route, path = "route") {
  const issues = [];
  expectRecord(route, path, issues);
  if (route === null || typeof route !== "object") return issues;
  requirePaths(route, ROUTE_REQUIRED_PATHS, issues, path);
  expectString(route.routeId, `${path}.routeId`, issues);
  expectNumber(route.version, `${path}.version`, issues, 1);
  expectString(route.hash, `${path}.hash`, issues);
  if (typeof route.hash === "string" && !/^[a-f0-9]{64}$/.test(route.hash)) {
    issues.push(`${path}.hash: must be a lowercase SHA-256 digest`);
  }
  expectNumber(route.totalDistanceM, `${path}.totalDistanceM`, issues, 0);
  expectArray(route.stops, `${path}.stops`, issues, 2);
  expectArray(route.legs, `${path}.legs`, issues, 1);
  expectArray(route.checkpoints, `${path}.checkpoints`, issues, 2);
  for (const [index, stop] of arrayValue(route.stops).entries()) {
    validateStop(stop, `${path}.stops.${index}`, issues);
  }
  for (const [index, leg] of arrayValue(route.legs).entries()) {
    validateLeg(leg, `${path}.legs.${index}`, issues);
  }
  for (const [index, checkpoint] of arrayValue(route.checkpoints).entries()) {
    validateCheckpoint(checkpoint, `${path}.checkpoints.${index}`, issues);
  }
  issues.push(...validateRouteIntegrityV3(route, path));
  return issues;
}

function validateStop(stop, path, issues) {
  expectRecord(stop, path, issues);
  for (const key of ["id", "name", "locationType"]) {
    expectString(stop?.[key], `${path}.${key}`, issues);
  }
  for (const key of ["lng", "lat", "z"]) {
    expectNumber(stop?.[key], `${path}.${key}`, issues);
  }
  if (stop?.poiId !== null) expectString(stop?.poiId, `${path}.poiId`, issues);
  if (stop && !Object.hasOwn(stop, "poiName")) issues.push(`${path}.poiName: is required`);
  else expectString(stop?.poiName, `${path}.poiName`, issues, true);
  expectRecord(stop?.provenance, `${path}.provenance`, issues);
  if (!["map", "poi", "gps"].includes(stop?.provenance?.method)) {
    issues.push(`${path}.provenance.method: unsupported placement method`);
  }
  if (stop?.provenance?.method === "gps") {
    validateGpsProvenance(stop.provenance, `${path}.provenance`, issues);
  }
}

function validateLeg(leg, path, issues) {
  expectRecord(leg, path, issues);
  for (const key of ["id", "fromStopId", "toStopId"]) {
    expectString(leg?.[key], `${path}.${key}`, issues);
  }
  expectNumber(leg?.distanceM, `${path}.distanceM`, issues, 0);
  expectArray(leg?.geometry, `${path}.geometry`, issues, 2);
  for (const [index, point] of arrayValue(leg?.geometry).entries()) {
    for (const key of ["lng", "lat", "z"]) {
      expectNumber(point?.[key], `${path}.geometry.${index}.${key}`, issues);
    }
  }
}

function validateCheckpoint(checkpoint, path, issues) {
  expectRecord(checkpoint, path, issues);
  expectString(checkpoint?.id, `${path}.id`, issues);
  expectNumber(checkpoint?.sequence, `${path}.sequence`, issues, 0);
  if (!["stop", "intermediate"].includes(checkpoint?.type)) {
    issues.push(`${path}.type: must be stop or intermediate`);
  }
  for (const key of ["lng", "lat", "z"]) {
    expectNumber(checkpoint?.[key], `${path}.${key}`, issues);
  }
  expectNumber(checkpoint?.spacingBasisM, `${path}.spacingBasisM`, issues, 0);
  if (checkpoint?.dwellSeconds !== undefined) {
    expectNumber(checkpoint.dwellSeconds, `${path}.dwellSeconds`, issues, 0);
  }
  if (checkpoint?.stopId !== null) {
    expectString(checkpoint?.stopId, `${path}.stopId`, issues);
  }
  if (checkpoint?.legId !== null) {
    expectString(checkpoint?.legId, `${path}.legId`, issues);
  }
  const stopTarget = checkpoint?.type === "stop" && checkpoint?.stopId !== null;
  const legTarget = checkpoint?.type === "intermediate" && checkpoint?.legId !== null;
  if (!stopTarget && !legTarget) {
    issues.push(`${path}: must reference its stop or leg`);
  }
}

function validateGpsProvenance(provenance, path, issues) {
  expectNumber(provenance.accuracyM, `${path}.accuracyM`, issues, 0);
  expectIso(provenance.capturedAt, `${path}.capturedAt`, issues);
  expectRecord(provenance.capturedPosition, `${path}.capturedPosition`, issues);
  for (const key of ["lng", "lat"]) {
    expectNumber(
      provenance.capturedPosition?.[key],
      `${path}.capturedPosition.${key}`,
      issues,
    );
  }
  if (typeof provenance.adjusted !== "boolean") {
    issues.push(`${path}.adjusted: must be a boolean`);
  }
}

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}
