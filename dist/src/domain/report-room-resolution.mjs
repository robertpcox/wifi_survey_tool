// FEATURE:      Dynamic room-resolution scoring
// SURFACE:      scoreRoomMoment(options), scoreRoomObservation(observation, lookups)
// WHY TOGETHER: Polygon membership, outcome precedence, and dwell settlement are one verdict.
// STATE:        None
// RULES:        MazeMap is room truth; raw Cisco positions are never snapped or corrected.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import { roomContainsPoint } from "./report-room-geometry.mjs";

const UNSCORED = new Set(["truth-unavailable", "lookup-unavailable"]);

export function scoreRoomMoment({
  evidence, expected, observed, expectedError, observedError,
}) {
  if (expectedError) return verdict("lookup-unavailable", evidence, observed);
  if (!expected?.geometry) return verdict("truth-unavailable", evidence, observed);
  if (!evidence?.point) return verdict("no-displayed-fix", evidence, observed);
  if (Number(evidence.point.z) !== Number(expected.z)) {
    return verdict("wrong-floor", evidence, observed);
  }
  if (roomContainsPoint(expected, evidence.point)) {
    return verdict("resolved", evidence, expected);
  }
  if (observedError) return verdict("lookup-unavailable", evidence, observed);
  const status = observed?.id && observed.id !== expected.id
    ? "wrong-room"
    : "unresolved";
  return verdict(status, evidence, observed);
}
export function scoreRoomObservation(observation, lookups) {
  const evidenceMoments = observation.moments?.length
    ? observation.moments : legacyMoments(observation);
  const moments = evidenceMoments.map((evidence, index) => {
    const lookup = momentLookup(lookups, index, evidenceMoments.length);
    return scoreRoomMoment({
      evidence,
      expected: lookups.expected,
      observed: lookup.room,
      expectedError: lookups.expectedError,
      observedError: lookup.error,
    });
  });
  const entry = moments[0];
  const exit = moments.at(-1);
  const primary = observation.observationKind === "dwell" ? exit : entry;
  const duration = dwellDuration(moments);
  const points = evidenceMoments.map(item => item?.point);
  return Object.freeze({
    ...observation,
    expectedRoom: publicRoom(lookups.expected),
    moments,
    entry,
    exit,
    primary,
    settleState: settleState(observation, moments),
    stuckThroughDwell: observation.observationKind === "dwell"
      && exit.status !== "resolved"
      && points.length > 1 && points.every(Boolean)
      && points.every(point => samePoint(points[0], point)),
    firstResolutionLagSeconds: firstResolutionLag(observation, moments),
    dwellScoredSeconds: duration.scored,
    dwellResolvedSeconds: duration.resolved,
    dwellResolutionPercent: percent(duration.resolved, duration.scored),
    dwellFailureMomentCount: moments.filter(item => (
      !UNSCORED.has(item.status) && item.status !== "resolved"
    )).length,
    scored: !UNSCORED.has(primary.status),
    resolved: primary.status === "resolved",
  });
}
function settleState(observation, moments) {
  if (observation.observationKind !== "dwell") return "check-in-only";
  const entry = moments[0].status;
  const exit = moments.at(-1).status;
  if (UNSCORED.has(entry) || UNSCORED.has(exit)) return "unscored";
  const middle = moments.slice(1, -1)
    .map(item => item.status).filter(status => !UNSCORED.has(status));
  if (entry === "resolved" && exit === "resolved") {
    return middle.some(status => status !== "resolved")
      ? "intermittent-resolution" : "already-resolved";
  }
  if (entry !== "resolved" && exit === "resolved") return "resolved-during-dwell";
  if (entry === "resolved" && exit !== "resolved") return "lost-resolution";
  if (middle.includes("resolved")) return "temporary-resolution";
  return "not-resolved-at-exit";
}
function verdict(status, evidence, room) {
  return Object.freeze({
    status,
    atMs: finite(evidence?.atMs),
    pollId: evidence?.pollId ?? null,
    ageSeconds: finite(evidence?.ageSeconds),
    point: evidence?.point ? { ...evidence.point } : null,
    room: publicRoom(room),
  });
}
function legacyMoments(observation) {
  return observation.observationKind !== "dwell" && observation.exit === observation.entry
    ? [observation.entry] : [observation.entry, observation.exit];
}

function momentLookup(lookups, index, length) {
  if (lookups.moments?.[index]) return lookups.moments[index];
  if (index === 0) return { room: lookups.entry, error: lookups.entryError };
  if (index === length - 1) return { room: lookups.exit, error: lookups.exitError };
  return { room: null, error: null };
}

function firstResolutionLag(observation, moments) {
  const first = moments.find(item => item.status === "resolved");
  return first && Number.isFinite(first.atMs) && Number.isFinite(observation.startMs)
    ? roundSeconds((first.atMs - observation.startMs) / 1000) : null;
}

function dwellDuration(moments) {
  let scored = 0;
  let resolved = 0;
  for (let index = 0; index < moments.length - 1; index++) {
    const seconds = (moments[index + 1].atMs - moments[index].atMs) / 1000;
    if (!(seconds > 0) || UNSCORED.has(moments[index].status)) continue;
    scored += seconds;
    if (moments[index].status === "resolved") resolved += seconds;
  }
  return { scored: roundSeconds(scored), resolved: roundSeconds(resolved) };
}

function publicRoom(room) {
  return room ? Object.freeze({
    id: room.id ?? null,
    name: room.name ?? null,
    z: Number.isFinite(room.z) ? room.z : null,
  }) : null;
}

function samePoint(left, right) {
  if (!left || !right) return left === right;
  return left.lng === right.lng && left.lat === right.lat && left.z === right.z;
}

function finite(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function percent(part, whole) {
  return whole > 0 ? roundSeconds(part / whole * 100) : null;
}

function roundSeconds(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
