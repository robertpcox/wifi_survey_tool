import { haversine, pathLength } from "./geometry.mjs";

export const SHORT_LEG_THRESHOLD_M = 10;

const ENDPOINT_GAP_M = 6;

export function createRouteLegV3(fromStop, toStop, geometry, index) {
  if (!Number.isInteger(index) || index < 0) {
    throw new TypeError("route.legs index must be a non-negative integer");
  }
  const start = routePoint(fromStop, "fromStop");
  const end = routePoint(toStop, "toStop");
  if (!Array.isArray(geometry) || geometry.length < 2) {
    throw new TypeError(`route.legs.${index}.geometry: must contain at least 2 points`);
  }
  const points = geometry
    .map((point, pointIndex) => routePoint(point, `geometry.${pointIndex}`));
  if (samePoint(points[0], start)) points[0] = start;
  else points.unshift(start);
  if (samePoint(points.at(-1), end)) points[points.length - 1] = end;
  else points.push(end);
  return {
    id: `leg-${index + 1}`,
    fromStopId: requiredId(fromStop, "fromStop.id"),
    toStopId: requiredId(toStop, "toStop.id"),
    distanceM: pathLength(points),
    geometry: points,
  };
}

export function generateRouteCheckpointsV3(stops, legs, spacingM) {
  const spacing = finiteAtLeast(spacingM, 0, "checkpointSpacingM");
  const checkpoints = [];
  const shortLegs = [];
  if (!Array.isArray(stops) || !stops.length) return { checkpoints, shortLegs };
  addStopCheckpoint(checkpoints, stops[0], spacing);
  (legs || []).forEach((leg, legIndex) => {
    const geometry = leg.geometry || [];
    const distanceM = Number.isFinite(leg.distanceM)
      ? leg.distanceM
      : pathLength(geometry);
    if (distanceM < SHORT_LEG_THRESHOLD_M) {
      shortLegs.push({
        legId: String(leg.id),
        fromStopId: String(leg.fromStopId),
        toStopId: String(leg.toStopId),
        distanceM,
      });
    } else if (spacing > 0) {
      for (let distance = spacing; distance < distanceM; distance += spacing) {
        if (distance < ENDPOINT_GAP_M
          || distanceM - distance < ENDPOINT_GAP_M) continue;
        const point = pointAlong(geometry, distance);
        if (haversine(point, geometry[0]) < ENDPOINT_GAP_M
          || haversine(point, geometry.at(-1)) < ENDPOINT_GAP_M) continue;
        addCheckpoint(checkpoints, {
          type: "intermediate",
          ...point,
          stopId: null,
          legId: String(leg.id),
          spacingBasisM: spacing,
        });
      }
    }
    const stop = stops.find(candidate => candidate.id === leg.toStopId)
      || stops[legIndex + 1];
    if (stop) addStopCheckpoint(checkpoints, stop, spacing);
  });
  return { checkpoints, shortLegs };
}

function addStopCheckpoint(checkpoints, stop, spacingBasisM) {
  addCheckpoint(checkpoints, {
    type: "stop",
    ...routePoint(stop, `stops.${checkpoints.length}`),
    stopId: requiredId(stop, "stop.id"),
    legId: null,
    spacingBasisM,
  });
}

function addCheckpoint(checkpoints, checkpoint) {
  const sequence = checkpoints.length;
  checkpoints.push({
    id: `checkpoint-${sequence + 1}`,
    sequence,
    ...checkpoint,
  });
}

function pointAlong(points, targetM) {
  let travelledM = 0;
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const segmentM = haversine(from, to);
    if (segmentM > 0 && travelledM + segmentM >= targetM) {
      const fraction = (targetM - travelledM) / segmentM;
      return {
        lng: from.lng + (to.lng - from.lng) * fraction,
        lat: from.lat + (to.lat - from.lat) * fraction,
        z: fraction === 1 ? to.z : from.z,
      };
    }
    travelledM += segmentM;
  }
  return routePoint(points.at(-1), "leg.geometry");
}

function routePoint(value, path) {
  const point = {
    lng: Number(value?.lng),
    lat: Number(value?.lat),
    z: Number(value?.z),
  };
  if (!Object.values(point).every(Number.isFinite)) {
    throw new TypeError(`${path}: lng, lat, and z must be finite numbers`);
  }
  return point;
}

function samePoint(a, b) {
  return a.lng === b.lng && a.lat === b.lat && a.z === b.z;
}

function requiredId(value, path) {
  if (typeof value?.id !== "string" || !value.id.trim()) {
    throw new TypeError(`${path}: must be a non-empty string`);
  }
  return value.id;
}

function finiteAtLeast(value, minimum, path) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) {
    throw new TypeError(`${path}: must be a finite number at least ${minimum}`);
  }
  return number;
}
