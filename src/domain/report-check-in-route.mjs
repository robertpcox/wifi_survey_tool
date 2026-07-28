// FEATURE:      Report Player route truth
// SURFACE:      projectReportCheckIns(result, route)
// WHY TOGETHER: Authored checkpoint anchors and captured check-ins share one monotonic projection.
// STATE:        None
// RULES:        A check-in stays inside its authored checkpoint interval and declared floor.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth contract

import { checkpointDwellSeconds } from "./checkpoint-dwell-v3.mjs";

export function projectReportCheckIns(result, route) {
  const checkpoints = [...(result?.route?.checkpoints ?? [])]
    .sort((left, right) => left.sequence - right.sequence);
  const anchors = checkpointAnchors(checkpoints, route);
  const byId = new Map(anchors.map(anchor => [anchor.checkpoint.id, anchor]));
  const checkIns = [...(result?.checkIns ?? [])]
    .sort((left, right) => timestampMs(left.at) - timestampMs(right.at));
  let previousDistanceM = 0;
  return checkIns.map((checkIn, index) => {
    const authored = byId.get(checkIn.checkpointId);
    if (!authored) {
      throw new TypeError(`checkIns.${index}.checkpointId: must name a route checkpoint`);
    }
    const groundTruth = checkedPoint(
      checkIn.groundTruth,
      `checkIns.${index}.groundTruth`,
    );
    const minimum = Math.max(previousDistanceM, authored.intervalStartDistanceM);
    const projected = route.project(groundTruth, {
      minDistanceM: minimum,
      maxDistanceM: authored.intervalEndDistanceM,
      legIndex: authored.legIndex,
      z: groundTruth.z,
    }) ?? authored;
    previousDistanceM = projected.routeDistanceM;
    return {
      checkpointId: checkIn.checkpointId,
      checkpointIndex: authored.checkpointIndex,
      dwellSeconds: checkpointDwellSeconds(
        authored.checkpoint,
        result?.run?.checkpointDwellSeconds,
      ),
      atMs: timestampMs(checkIn.at),
      lng: projected.lng,
      lat: projected.lat,
      z: projected.z,
      routeDistanceM: projected.routeDistanceM,
      cumulativeDistanceM: projected.routeDistanceM,
      activeLegId: projected.activeLegId,
      activeLegIndex: projected.activeLegIndex,
      projectionDistanceM: projected.projectionDistanceM,
      authoredLng: groundTruth.lng,
      authoredLat: groundTruth.lat,
      authoredZ: groundTruth.z,
      checkpointInterval: {
        startDistanceM: authored.intervalStartDistanceM,
        endDistanceM: authored.intervalEndDistanceM,
      },
    };
  });
}

function checkpointAnchors(checkpoints, route) {
  let previousDistanceM = 0;
  const anchors = checkpoints.map((checkpoint, checkpointIndex) => {
    const legIndex = route.legs.findIndex(leg => leg.id === checkpoint.legId);
    const boundary = stopBoundary(checkpoint, route);
    const options = {
      minDistanceM: boundary ?? previousDistanceM,
      maxDistanceM: boundary ?? (
        legIndex >= 0 ? route.legs[legIndex].endDistanceM : route.totalDistanceM
      ),
      legIndex: legIndex >= 0 ? legIndex : undefined,
      z: checkpoint.z,
    };
    const projected = route.project(checkpoint, options);
    if (!projected) {
      throw new TypeError(`route.checkpoints.${checkpointIndex}: is not on its route interval`);
    }
    previousDistanceM = Math.max(previousDistanceM, projected.routeDistanceM);
    return {
      checkpoint,
      checkpointIndex,
      legIndex: legIndex >= 0 ? legIndex : undefined,
      ...projected,
      routeDistanceM: previousDistanceM,
    };
  });
  return anchors.map((anchor, index) => ({
    ...anchor,
    intervalStartDistanceM: intervalEdge(anchors[index - 1], anchor, 0),
    intervalEndDistanceM: intervalEdge(
      anchor,
      anchors[index + 1],
      route.totalDistanceM,
    ),
  }));
}

function stopBoundary(checkpoint, route) {
  if (!checkpoint.stopId) return null;
  const arriving = route.legs.find(leg => leg.toStopId === checkpoint.stopId);
  if (arriving) return arriving.endDistanceM;
  const departing = route.legs.find(leg => leg.fromStopId === checkpoint.stopId);
  return departing?.startDistanceM ?? null;
}

function intervalEdge(left, right, fallback) {
  return left && right
    ? (left.routeDistanceM + right.routeDistanceM) / 2
    : fallback;
}

function timestampMs(value) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError("check-in time must be an ISO timestamp");
  return parsed;
}

function checkedPoint(point, path) {
  if (![point?.lng, point?.lat, point?.z].every(Number.isFinite)) {
    throw new TypeError(`${path}: lng, lat, and z must be finite`);
  }
  return point;
}
