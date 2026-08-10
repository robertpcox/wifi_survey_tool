// FEATURE:      Consolidated corridor resolution summary
// SURFACE:      buildCorridorResolutionSummary(scoredObservations)
// WHY TOGETHER: Multi-point containment, directions, corridor ranking, and drift map share one aggregate.
// STATE:        None
// RULES:        Group by MazeMap POI identity and preserve unsnapped Cisco failure positions.
// PROVENANCE:   Long-corridor MazeMap area-resolution evidence

export function buildCorridorResolutionSummary(observations = []) {
  const scored = observations.filter(item => item.scored);
  const resolved = scored.filter(item => item.resolved);
  const failures = scored.filter(item => !item.resolved);
  return Object.freeze({
    sampleCount: observations.length,
    scoredSampleCount: scored.length,
    resolvedSampleCount: resolved.length,
    failedSampleCount: failures.length,
    unscoredSampleCount: observations.length - scored.length,
    resolutionPercent: percent(resolved.length, scored.length),
    corridors: corridorGroups(observations),
    truthIssuePoints: groupPoints(failures, item => item.target),
    ciscoIssuePoints: groupPoints(failures, item => item.primary.point),
    observations,
  });
}

function corridorGroups(observations) {
  const groups = new Map();
  for (const sample of observations) {
    const room = sample.expectedRoom;
    const key = room?.id ? `poi:${room.id}` : `point:${pointKey(sample.target)}`;
    if (!groups.has(key)) groups.set(key, {
      poiId: room?.id ?? null,
      name: room?.name ?? "Unmapped corridor",
      z: room?.z ?? sample.target.z,
      point: sample.target,
      samples: 0, resolved: 0, failures: 0, unscored: 0,
      forward: 0, reverse: 0, forwardFailures: 0, reverseFailures: 0,
      runIds: new Set(), devices: new Set(),
    });
    const group = groups.get(key);
    group.samples += 1;
    if (sample.scored && sample.resolved) group.resolved += 1;
    if (sample.scored && !sample.resolved) group.failures += 1;
    if (!sample.scored) group.unscored += 1;
    if (sample.direction === "forward") group.forward += 1;
    if (sample.direction === "reverse") group.reverse += 1;
    if (sample.scored && !sample.resolved && sample.direction === "forward") {
      group.forwardFailures += 1;
    }
    if (sample.scored && !sample.resolved && sample.direction === "reverse") {
      group.reverseFailures += 1;
    }
    group.runIds.add(sample.resultId);
    group.devices.add(deviceLabel(sample.device));
  }
  return [...groups.values()].map(group => ({
    ...group,
    runCount: group.runIds.size,
    resolutionPercent: percent(group.resolved, group.resolved + group.failures),
    bothDirections: group.forward > 0 && group.reverse > 0,
    bothFailureDirections: group.forwardFailures > 0 && group.reverseFailures > 0,
    runIds: [...group.runIds].sort(),
    devices: [...group.devices].sort(),
  })).sort((left, right) => right.failures - left.failures
    || right.samples - left.samples || left.name.localeCompare(right.name));
}

function groupPoints(observations, select) {
  const groups = new Map();
  for (const observation of observations) {
    const point = select(observation);
    if (!point) continue;
    const key = pointKey(point);
    const group = groups.get(key) ?? { ...point, weight: 0, runIds: new Set() };
    group.weight += 1;
    group.runIds.add(observation.resultId);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    lng: group.lng, lat: group.lat, z: group.z,
    weight: group.weight, runCount: group.runIds.size,
  }));
}

function pointKey(point) {
  return `${point.z}:${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
}

function deviceLabel(device = {}) {
  return [device.name, device.type, device.os].filter(Boolean).join(" · ")
    || "Unknown device";
}

function percent(part, whole) {
  return whole ? Math.round(part / whole * 1000) / 10 : null;
}
