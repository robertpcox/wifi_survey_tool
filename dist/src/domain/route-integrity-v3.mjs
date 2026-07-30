export function validateRouteIntegrityV3(route, path = "route") {
  const stops = Array.isArray(route?.stops) ? route.stops : [];
  const legs = Array.isArray(route?.legs) ? route.legs : [];
  const checkpoints = Array.isArray(route?.checkpoints) ? route.checkpoints : [];
  const issues = [];
  validateUniqueIds(stops, `${path}.stops`, issues);
  validateUniqueIds(legs, `${path}.legs`, issues);
  validateUniqueIds(checkpoints, `${path}.checkpoints`, issues);
  if (stops.length >= 2 && legs.length !== stops.length - 1) {
    issues.push(`${path}.legs: must connect each adjacent stop exactly once`);
  }
  legs.forEach((leg, index) => {
    const expectedFrom = stops[index]?.id;
    const expectedTo = stops[index + 1]?.id;
    if (leg?.fromStopId !== expectedFrom) {
      issues.push(`${path}.legs.${index}.fromStopId: must match stops.${index}.id`);
    }
    if (leg?.toStopId !== expectedTo) {
      issues.push(`${path}.legs.${index}.toStopId: must match stops.${index + 1}.id`);
    }
    validateEndpoints(leg, stops[index], stops[index + 1], `${path}.legs.${index}`, issues);
  });
  const distance = legs.reduce(
    (total, leg) => total + (Number.isFinite(leg?.distanceM) ? leg.distanceM : 0),
    0,
  );
  if (Number.isFinite(route?.totalDistanceM)
    && Math.abs(distance - route.totalDistanceM) > 1e-6) {
    issues.push(`${path}.totalDistanceM: must equal the sum of leg distances`);
  }
  const stopIds = new Set(stops.map(stop => stop?.id));
  const legIds = new Set(legs.map(leg => leg?.id));
  const checkpointStopIds = new Set();
  checkpoints.forEach((checkpoint, index) => {
    if (checkpoint?.sequence !== index) {
      issues.push(`${path}.checkpoints.${index}.sequence: must equal ${index}`);
    }
    if (checkpoint?.type === "stop") {
      checkpointStopIds.add(checkpoint.stopId);
      if (!stopIds.has(checkpoint.stopId) || checkpoint.legId !== null) {
        issues.push(`${path}.checkpoints.${index}: stop reference is invalid`);
      }
    }
    if (checkpoint?.type === "intermediate"
      && (!legIds.has(checkpoint.legId) || checkpoint.stopId !== null)) {
      issues.push(`${path}.checkpoints.${index}: leg reference is invalid`);
    }
  });
  for (const [index, stop] of stops.entries()) {
    if (!checkpointStopIds.has(stop?.id)) {
      issues.push(`${path}.stops.${index}.id: requires a stop checkpoint`);
    }
  }
  return issues;
}

function validateUniqueIds(values, path, issues) {
  const ids = new Set();
  values.forEach((value, index) => {
    if (typeof value?.id !== "string") return;
    if (ids.has(value.id)) issues.push(`${path}.${index}.id: must be unique`);
    ids.add(value.id);
  });
}

function validateEndpoints(leg, from, to, path, issues) {
  const points = Array.isArray(leg?.geometry) ? leg.geometry : [];
  if (points.length < 2) return;
  if (!samePoint(points[0], from)) {
    issues.push(`${path}.geometry.0: must equal the from-stop position`);
  }
  if (!samePoint(points.at(-1), to)) {
    issues.push(`${path}.geometry.${points.length - 1}: must equal the to-stop position`);
  }
}

function samePoint(left, right) {
  return left?.lng === right?.lng
    && left?.lat === right?.lat
    && left?.z === right?.z;
}
