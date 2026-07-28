// FEATURE:      Report Player ground truth
// SURFACE:      buildGroundTruthModel(result), buildReportGroundTruth(result)
// WHY TOGETHER: Check-in timing, planned dwell, and interpolation form one time model.
// STATE:        Check-in segments captured by the returned lookup function
// RULES:        Dwell starts at check-in; movement ends at the next exact check-in.
// PROVENANCE:   Step 5 report analysis and playback contract

export function buildGroundTruthModel(result) {
  if (result?.schemaVersion !== 3) {
    throw new TypeError("Report ground truth requires a schemaVersion 3 result.");
  }
  const dwellSeconds = finiteNonNegative(
    result?.run?.checkpointDwellSeconds,
    "run.checkpointDwellSeconds",
  );
  const points = (result.checkIns ?? []).map((checkIn, index) => {
    const atMs = timestampMs(checkIn.at, `checkIns.${index}.at`);
    const groundTruth = checkIn.groundTruth ?? {};
    return {
      checkpointId: checkIn.checkpointId,
      atMs,
      lat: finite(groundTruth.lat, `checkIns.${index}.groundTruth.lat`),
      lng: finite(groundTruth.lng, `checkIns.${index}.groundTruth.lng`),
      z: finite(groundTruth.z, `checkIns.${index}.groundTruth.z`),
    };
  }).sort((left, right) => left.atMs - right.atMs);
  if (!points.length) {
    throw new TypeError("Report ground truth requires at least one check-in.");
  }
  const stoppedAtMs = timestampMs(result.run.stoppedAt, "run.stoppedAt");
  const segments = buildSegments(points, dwellSeconds * 1000, stoppedAtMs);
  const startMs = points[0].atMs;
  const endMs = Math.max(points.at(-1).atMs, segments.at(-1)?.endMs ?? startMs);
  return Object.freeze({
    dwellSeconds,
    startMs,
    endMs,
    points: points.map(publicPoint),
    segments: segments.map(publicSegment),
    at(value) {
      const atMs = value instanceof Date ? value.getTime() : (
        typeof value === "number" ? value : Date.parse(value)
      );
      if (!Number.isFinite(atMs) || atMs < startMs || atMs > endMs) return null;
      const point = points.find(candidate => candidate.atMs === atMs);
      if (point) {
        const plannedDwell = segments.some(segment => (
          !segment.moving && segment.startMs === atMs
        ));
        return stationaryTruth(point, atMs, plannedDwell);
      }
      const segment = segments.find(candidate => (
        atMs >= candidate.startMs
        && (atMs < candidate.endMs || atMs === endMs)
      ));
      if (segment) return interpolate(segment, atMs);
      return null;
    },
  });
}

export const buildReportGroundTruth = buildGroundTruthModel;

function buildSegments(points, dwellMs, stoppedAtMs) {
  const segments = [];
  points.forEach((point, index) => {
    const next = points[index + 1];
    const horizon = next?.atMs ?? Math.max(point.atMs, stoppedAtMs);
    const dwellEndMs = Math.min(point.atMs + dwellMs, horizon);
    if (dwellEndMs > point.atMs) {
      segments.push({
        startMs: point.atMs, endMs: dwellEndMs,
        moving: false, from: point, to: point,
      });
    }
    if (next && next.atMs > dwellEndMs) {
      segments.push({
        startMs: dwellEndMs, endMs: next.atMs,
        moving: true, from: point, to: next,
      });
    }
  });
  return segments;
}

function interpolate(segment, atMs) {
  const span = segment.endMs - segment.startMs;
  const fraction = segment.moving && span > 0
    ? (atMs - segment.startMs) / span
    : 0;
  return {
    at: new Date(atMs).toISOString(),
    lat: segment.from.lat + (segment.to.lat - segment.from.lat) * fraction,
    lng: segment.from.lng + (segment.to.lng - segment.from.lng) * fraction,
    z: fraction >= 1 ? segment.to.z : segment.from.z,
    moving: segment.moving,
    plannedDwell: !segment.moving,
    fromCheckpointId: segment.from.checkpointId,
    toCheckpointId: segment.to.checkpointId,
  };
}

function stationaryTruth(point, atMs, plannedDwell) {
  return {
    at: new Date(atMs).toISOString(),
    lat: point.lat, lng: point.lng, z: point.z,
    moving: false, plannedDwell,
    fromCheckpointId: point.checkpointId,
    toCheckpointId: point.checkpointId,
  };
}

function publicPoint(point) {
  return { ...point, at: new Date(point.atMs).toISOString() };
}

function publicSegment(segment) {
  return {
    startMs: segment.startMs,
    endMs: segment.endMs,
    moving: segment.moving,
  };
}

function timestampMs(value, path) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new TypeError(`${path}: must be an ISO timestamp`);
  return parsed;
}

function finite(value, path) {
  if (!Number.isFinite(value)) throw new TypeError(`${path}: must be finite`);
  return value;
}

function finiteNonNegative(value, path) {
  const number = finite(value, path);
  if (number < 0) throw new TypeError(`${path}: must be at least zero`);
  return number;
}
