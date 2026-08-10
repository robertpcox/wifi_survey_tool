// FEATURE:      Dynamic room capture values
// SURFACE:      Exact map records, timestamps, and monotonic dwell calculations
// WHY TOGETHER: Capture records must derive from one validated point and clock boundary.
// STATE:        None
// RULES:        Stop, checkpoint, check-in, and event identity never diverge.
// PROVENANCE:   Step 4 Runner dynamic-room extension

export function exactDynamicRoomPoint(value) {
  const point = coordinates(value);
  const name = String(value?.name ?? "").trim();
  const exact = name ? { ...point, name } : point;
  if (value?._mapContext) {
    exact._mapContext = structuredClone(value._mapContext);
  }
  return exact;
}

export function dynamicRoomCheckInRecords(
  point,
  sequence,
  atValue,
  dwellSeconds,
  spacingBasisM = 0,
  stopIndex = sequence,
) {
  const at = dynamicRoomTimestamp(atValue);
  const poi = point._mapContext?.poi ?? {};
  const stop = {
    id: `stop-${stopIndex + 1}`,
    name: point.name || `Checkpoint ${stopIndex + 1}`,
    ...coordinates(point),
    poiId: textOrNull(poi.id),
    poiName: textOrNull(poi.name),
    locationType: "room",
    provenance: { method: "map" },
  };
  if (point._mapContext) {
    stop._mapContext = structuredClone(point._mapContext);
  }
  const checkpoint = {
    id: `checkpoint-${sequence + 1}`,
    sequence,
    type: "stop",
    ...coordinates(stop),
    stopId: stop.id,
    legId: null,
    spacingBasisM,
    dwellSeconds,
  };
  const checkIn = {
    checkpointId: checkpoint.id,
    at,
    groundTruth: coordinates(point),
  };
  const event = { type: "checkpoint-reached", at, checkpointId: checkpoint.id };
  return { stop, checkpoint, checkIn, event };
}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function remainingDynamicRoomDwellSeconds(dwell, nowMs) {
  if (!dwell) return 0;
  return Math.max(
    0,
    Math.ceil((dwell.deadlineMs - dynamicRoomMonotonic(nowMs)) / 1000),
  );
}

export function dynamicRoomMonotonic(value) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError("nowMs: must be a non-negative monotonic time");
  }
  return value;
}

export function dynamicRoomTimestamp(value) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError("at: must be an ISO timestamp");
  }
  return value;
}

function coordinates(value) {
  const point = {
    lng: Number(value?.lng),
    lat: Number(value?.lat),
    z: Number(value?.z),
  };
  if (!Object.values(point).every(Number.isFinite)) {
    throw new TypeError("point: lng, lat, and z must be finite numbers");
  }
  return point;
}
