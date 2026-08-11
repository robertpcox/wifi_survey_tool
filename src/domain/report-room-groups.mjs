// FEATURE:      Room-resolution grouping
// SURFACE:      groupRoomVisits(visits), groupRoomRuns(visits)
// WHY TOGETHER: POI/run identity and shared outcome counters form one grouping contract.
// STATE:        None
// RULES:        Group rooms by POI before coordinate fallback; preserve devices and run IDs.
// PROVENANCE:   Consolidated dynamic room report

export function groupRoomVisits(visits) {
  const groups = new Map();
  for (const visit of visits) {
    const room = visit.expectedRoom;
    const key = room?.id ? `poi:${room.id}` : `point:${pointKey(visit.target)}`;
    if (!groups.has(key)) groups.set(key, {
      poiId: room?.id ?? null,
      identifier: room?.identifier ?? null,
      name: room?.name ?? visit.roomLabel,
      z: room?.z ?? visit.target.z,
      point: visit.target,
      visits: 0, resolved: 0, failures: 0, unscored: 0,
      settled: 0, stuck: 0, drifted: 0,
      maxOutsideDistanceM: null,
      runIds: new Set(), devices: new Set(),
    });
    const group = groups.get(key);
    group.visits += 1;
    if (visit.scored && visit.resolved) group.resolved += 1;
    if (visit.scored && !visit.resolved) group.failures += 1;
    if (!visit.scored) group.unscored += 1;
    if (visit.settleState === "resolved-during-dwell") group.settled += 1;
    if (visit.stuckThroughDwell) group.stuck += 1;
    if (visit.observationKind === "dwell" && visit.dwellFailureMomentCount > 0) {
      group.drifted += 1;
    }
    const outsideDistanceM = maxMomentDistance(visit);
    if (Number.isFinite(outsideDistanceM)) {
      group.maxOutsideDistanceM = Math.max(
        group.maxOutsideDistanceM ?? 0, outsideDistanceM,
      );
    }
    group.runIds.add(visit.resultId);
    group.devices.add(deviceLabel(visit.device));
  }
  return [...groups.values()].map(group => ({
    ...group,
    runCount: group.runIds.size,
    failedPercent: percent(group.failures, group.visits),
    runIds: [...group.runIds].sort(),
    devices: [...group.devices].sort(),
  })).sort((left, right) => right.failures - left.failures
    || right.drifted - left.drifted || right.stuck - left.stuck
    || left.name.localeCompare(right.name));
}

export function groupRoomRuns(visits) {
  const groups = new Map();
  for (const visit of visits) {
    if (!groups.has(visit.resultId)) groups.set(visit.resultId, {
      resultId: visit.resultId,
      label: deviceLabel(visit.device),
      visits: 0, failures: 0, resolved: 0,
    });
    const group = groups.get(visit.resultId);
    group.visits += 1;
    if (visit.scored && visit.resolved) group.resolved += 1;
    if (visit.scored && !visit.resolved) group.failures += 1;
  }
  return [...groups.values()].sort((left, right) => right.failures - left.failures);
}

function pointKey(point) {
  return `${point.z}:${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
}

function maxMomentDistance(visit) {
  const moments = visit.moments?.length ? visit.moments : [visit.primary];
  const distances = moments.filter(moment => (
    ["resolved", "wrong-room", "unresolved"].includes(moment?.status)
      && Number.isFinite(moment.outsideDistanceM)
  )).map(moment => moment.outsideDistanceM);
  return distances.length ? Math.max(...distances) : null;
}

function deviceLabel(device = {}) {
  return [device.name, device.type, device.os].filter(Boolean).join(" · ") || "Unknown device";
}

function percent(part, whole) {
  return whole ? Math.round(part / whole * 1000) / 10 : null;
}
