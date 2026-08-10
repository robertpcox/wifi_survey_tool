// FEATURE:      MazeMap area-resolution summary
// SURFACE:      combineAreaResolutionSummaries(room, corridor)
// WHY TOGETHER: Room visits and corridor samples share map evidence but retain separate denominators.
// STATE:        None
// RULES:        Never collapse a corridor sample into the room-visit resolution rate.
// PROVENANCE:   Dynamic room and long-corridor area resolution

export function combineAreaResolutionSummaries(room, corridor) {
  const areaObservations = [
    ...(room.observations ?? []),
    ...(corridor.observations ?? []),
  ];
  return Object.freeze({
    ...room,
    corridor,
    areaObservations,
    areaPolygons: aggregateAreaPolygons(areaObservations),
    truthIssuePoints: [
      ...(room.truthIssuePoints ?? []),
      ...(corridor.truthIssuePoints ?? []),
    ],
    ciscoIssuePoints: [
      ...(room.ciscoIssuePoints ?? []),
      ...(corridor.ciscoIssuePoints ?? []),
    ],
  });
}

export function aggregateAreaPolygons(observations = []) {
  const groups = new Map();
  for (const observation of observations) {
    const room = observation.expectedRoom;
    if (!validGeometry(room?.geometry)) continue;
    const z = Number(room.z ?? observation.target?.z);
    if (!Number.isFinite(z)) continue;
    const key = areaKey(room, z);
    if (!groups.has(key)) groups.set(key, {
      areaKey: key,
      poiId: room.id ?? null,
      areaName: room.name ?? observation.roomLabel ?? "MazeMap area",
      z,
      geometry: room.geometry,
      observationCount: 0,
      scoredSampleCount: 0,
      insideSampleCount: 0,
      outsideSampleCount: 0,
      unscoredSampleCount: 0,
      runIds: new Set(),
      observationKinds: new Set(),
    });
    const group = groups.get(key);
    group.observationCount += 1;
    if (observation.resultId) group.runIds.add(observation.resultId);
    if (observation.observationKind) {
      group.observationKinds.add(observation.observationKind);
    }
    countVote(group, observation.primary);
  }
  return [...groups.values()].map(finalizeArea).sort((left, right) => (
    severityRank(right.severity) - severityRank(left.severity)
      || right.outsideSampleCount - left.outsideSampleCount
      || left.areaName.localeCompare(right.areaName)
      || left.areaKey.localeCompare(right.areaKey)
  ));
}

function countVote(group, moment) {
  if (moment?.status === "resolved") {
    group.scoredSampleCount += 1;
    group.insideSampleCount += 1;
    return;
  }
  if (["wrong-room", "unresolved", "wrong-floor", "no-displayed-fix"]
    .includes(moment?.status)) {
    group.scoredSampleCount += 1;
    group.outsideSampleCount += 1;
    return;
  }
  group.unscoredSampleCount += 1;
}

function finalizeArea(group) {
  return Object.freeze({
    ...group,
    runCount: group.runIds.size,
    resolutionPercent: percent(group.insideSampleCount, group.scoredSampleCount),
    severity: areaSeverity(group),
    runIds: [...group.runIds].sort(),
    observationKinds: [...group.observationKinds].sort(),
  });
}

function areaSeverity(group) {
  if (!group.scoredSampleCount) return "unscored";
  if (group.insideSampleCount > group.outsideSampleCount) return "good";
  if (group.outsideSampleCount > group.insideSampleCount) return "bad";
  return "mixed";
}

function severityRank(value) {
  return { unscored: 0, good: 1, mixed: 2, bad: 3 }[value] ?? 0;
}

function areaKey(room, z) {
  return room.id
    ? `poi:${room.id}:z:${z}`
    : `geometry:${z}:${JSON.stringify(room.geometry)}`;
}

function validGeometry(value) {
  return ["Polygon", "MultiPolygon"].includes(value?.type)
    && Array.isArray(value.coordinates);
}

function percent(part, whole) {
  return whole ? Math.round(part / whole * 1000) / 10 : null;
}
