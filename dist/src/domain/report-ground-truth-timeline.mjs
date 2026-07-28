// FEATURE:      Report Player ground truth
// SURFACE:      buildTruthSegments, truthAtTime, publicTruthSegment
// WHY TOGETHER: Dwell segmentation and time lookup interpret the same projected checkpoints.
// STATE:        None
// RULES:        Route distance advances only between planned dwell windows.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth contract

export function buildTruthSegments(points, dwellMs, stoppedAtMs) {
  const segments = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    const horizon = next?.atMs ?? Math.max(point.atMs, stoppedAtMs);
    const pointDwellMs = point.endpointHold && !next
      ? horizon - point.atMs
      : Number.isFinite(point.dwellSeconds)
        ? point.dwellSeconds * 1000
        : dwellMs;
    const dwellEndMs = Math.min(point.atMs + pointDwellMs, horizon);
    if (dwellEndMs > point.atMs) {
      segments.push(segment(point, point, next ?? point, point.atMs, dwellEndMs, false));
    }
    if (next && next.atMs > dwellEndMs) {
      segments.push(segment(point, next, next, dwellEndMs, next.atMs, true));
    }
  });
  return segments;
}

export function truthAtTime(points, segments, route, atMs, endMs) {
  const point = points.find(candidate => candidate.atMs === atMs);
  if (point) return truthAtCheckIn(point, segments, route, atMs);
  const active = segments.find(candidate => (
    atMs >= candidate.startMs
    && (atMs < candidate.endMs || atMs === endMs)
  ));
  return active ? truthOnSegment(active, route, atMs) : null;
}

export function publicTruthSegment(value) {
  return {
    startMs: value.startMs,
    endMs: value.endMs,
    moving: value.moving,
    fromCheckpointId: value.from.checkpointId,
    toCheckpointId: value.to.checkpointId,
    startDistanceM: value.intervalFrom.routeDistanceM,
    endDistanceM: value.intervalTo.routeDistanceM,
  };
}

function segment(from, to, intervalTo, startMs, endMs, moving) {
  return {
    startMs,
    endMs,
    moving,
    from,
    to,
    intervalFrom: from,
    intervalTo,
  };
}

function truthAtCheckIn(point, segments, route, atMs) {
  const active = segments.find(item => item.startMs === atMs);
  return publicTruth(
    point,
    active?.intervalFrom ?? point,
    active?.intervalTo ?? point,
    route,
    atMs,
    false,
    Boolean(active && !active.moving && !active.from.endpointHold),
    Boolean(active?.from.endpointHold),
    point.checkpointId,
    active?.intervalTo.checkpointId ?? point.checkpointId,
  );
}

function truthOnSegment(segmentValue, route, atMs) {
  const spanMs = segmentValue.endMs - segmentValue.startMs;
  const fraction = segmentValue.moving && spanMs > 0
    ? (atMs - segmentValue.startMs) / spanMs
    : 0;
  const distanceM = segmentValue.from.routeDistanceM
    + (segmentValue.to.routeDistanceM - segmentValue.from.routeDistanceM) * fraction;
  const position = segmentValue.moving
    ? movingPoint(segmentValue, route, distanceM, fraction)
    : segmentValue.from;
  return publicTruth(
    position,
    segmentValue.intervalFrom,
    segmentValue.intervalTo,
    route,
    atMs,
    segmentValue.moving,
    !segmentValue.moving && !segmentValue.from.endpointHold,
    Boolean(segmentValue.from.endpointHold),
    segmentValue.from.checkpointId,
    segmentValue.to.checkpointId,
  );
}

function movingPoint(segmentValue, route, distanceM, fraction) {
  if (segmentValue.from.routeDistanceM !== segmentValue.to.routeDistanceM) {
    return route.pointAt(distanceM);
  }
  return fraction >= 1 ? segmentValue.to : segmentValue.from;
}

function publicTruth(
  position,
  intervalFrom,
  intervalTo,
  route,
  atMs,
  moving,
  plannedDwell,
  endpointHold,
  fromCheckpointId,
  toCheckpointId,
) {
  const routeInterval = route.interval(
    intervalFrom.routeDistanceM,
    intervalTo.routeDistanceM,
  );
  const intervalLeg = routeInterval.segments[0];
  return {
    at: new Date(atMs).toISOString(),
    lat: position.lat,
    lng: position.lng,
    z: position.z,
    moving,
    plannedDwell,
    endpointHold,
    fromCheckpointId,
    toCheckpointId,
    routeDistanceM: position.routeDistanceM,
    cumulativeDistanceM: position.routeDistanceM,
    activeLegId: moving
      ? position.activeLegId
      : (intervalLeg?.legId ?? position.activeLegId),
    activeLegIndex: moving
      ? position.activeLegIndex
      : (intervalLeg?.legIndex ?? position.activeLegIndex),
    routeInterval,
  };
}
