// FEATURE:      Dynamic room-survey route authoring
// SURFACE:      Stop and provider-geometry validation for the ordered route queue
// WHY TOGETHER: Route identity and numeric point checks define which queued work is reusable.
// STATE:        None
// RULES:        Values are cloned; invalid or duplicate stops and missing geometry are rejected.
// PROVENANCE:   Dynamic room-survey Runner request

export function validatedDynamicStops(values) {
  if (!Array.isArray(values)) throw new TypeError("stops: must be an array");
  const stops = structuredClone(values);
  const ids = new Set();
  stops.forEach((stop, index) => {
    if (typeof stop?.id !== "string" || !stop.id.trim()) {
      throw new TypeError(`stops.${index}.id: must be a non-empty string`);
    }
    if (ids.has(stop.id)) {
      throw new TypeError(`stops.${index}.id: must be unique`);
    }
    ids.add(stop.id);
    checkedPoint(stop, `stops.${index}`);
  });
  return stops;
}

export function validatedDynamicGeometry(value) {
  if (!Array.isArray(value) || value.length < 2) {
    throw new TypeError("routeBetween: must return at least two route points");
  }
  return value.map(
    (point, index) => checkedPoint(point, `routeBetween.${index}`),
  );
}

export function sameDynamicRoutePair(job, from, to) {
  return JSON.stringify(job.from) === JSON.stringify(from)
    && JSON.stringify(job.to) === JSON.stringify(to);
}

export function newDynamicRouteJob(index, from, to) {
  return {
    index,
    from: structuredClone(from),
    to: structuredClone(to),
    status: "pending",
    geometry: null,
    error: null,
    attempts: 0,
  };
}

export function dynamicRouteFinaliseError(failures) {
  const error = new Error(
    `Dynamic route finalisation failed: ${failures
      .map(item => `${item.fromStopId} → ${item.toStopId}: ${item.message}`)
      .join("; ")}`,
  );
  error.failures = failures;
  return error;
}

function checkedPoint(value, path) {
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
