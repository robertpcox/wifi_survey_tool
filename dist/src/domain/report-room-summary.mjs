// FEATURE:      Consolidated room-resolution summary
// SURFACE:      buildRoomResolutionSummary(scoredObservations)
// WHY TOGETHER: Visit totals, room/run ranking, and geographic issue points share one aggregate.
// STATE:        None
// RULES:        Group rooms by POI identity; keep MazeMap truth and Cisco fix points separate.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import { groupRoomRuns, groupRoomVisits } from "./report-room-groups.mjs";
import { reportQuantile } from "./report-samples.mjs";

const FAILURE_STATUSES = [
  "wrong-room", "unresolved", "wrong-floor", "no-displayed-fix",
];

export function buildRoomResolutionSummary(observations) {
  const visits = observations ?? [];
  const scored = visits.filter(item => item.scored);
  const resolved = scored.filter(item => item.resolved);
  const failures = scored.filter(item => !item.resolved);
  const geographicIssues = visits.flatMap(issueMoments);
  const settleLags = visits.map(item => item.firstResolutionLagSeconds)
    .filter(value => Number.isFinite(value) && value > 0);
  const dwellScoredSeconds = sum(visits, "dwellScoredSeconds");
  const dwellResolvedSeconds = sum(visits, "dwellResolvedSeconds");
  return Object.freeze({
    visitCount: visits.length,
    scoredVisitCount: scored.length,
    resolvedVisitCount: resolved.length,
    failedVisitCount: failures.length,
    unscoredVisitCount: visits.length - scored.length,
    resolutionPercent: percent(resolved.length, scored.length),
    dwellVisitCount: visits.filter(item => item.observationKind === "dwell").length,
    checkInOnlyVisitCount: visits.filter(item => item.observationKind === "check-in").length,
    settledDuringDwellCount: count(visits, "settleState", "resolved-during-dwell"),
    lostResolutionCount: count(visits, "settleState", "lost-resolution"),
    intermittentResolutionCount: count(visits, "settleState", "intermittent-resolution"),
    temporaryResolutionCount: count(visits, "settleState", "temporary-resolution"),
    medianSettleSeconds: round(reportQuantile(settleLags, 0.5)),
    p95SettleSeconds: round(reportQuantile(settleLags, 0.95)),
    dwellScoredSeconds: round(dwellScoredSeconds),
    dwellResolvedSeconds: round(dwellResolvedSeconds),
    dwellResolutionPercent: percent(dwellResolvedSeconds, dwellScoredSeconds),
    unresolvedAtDwellEndCount: visits.filter(item => (
      item.observationKind === "dwell" && item.scored && !item.resolved
    )).length,
    stuckAtDwellEndCount: visits.filter(item => item.stuckThroughDwell).length,
    primaryFailures: Object.fromEntries(FAILURE_STATUSES.map(status => [
      status,
      failures.filter(item => item.primary.status === status).length,
    ])),
    rooms: groupRoomVisits(visits),
    runs: groupRoomRuns(visits),
    truthIssuePoints: groupPoints(geographicIssues, item => item.target),
    ciscoIssuePoints: groupPoints(geographicIssues, item => item.issuePoint),
    observations: visits,
  });
}

function groupPoints(visits, select) {
  const groups = new Map();
  for (const visit of visits) {
    const point = select(visit);
    if (!point) continue;
    const key = pointKey(point);
    const group = groups.get(key) ?? { ...point, weight: 0, runIds: new Set() };
    group.weight += 1;
    group.runIds.add(visit.resultId);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({
    lng: group.lng, lat: group.lat, z: group.z,
    weight: group.weight,
    runCount: group.runIds.size,
  }));
}

function pointKey(point) {
  return `${point.z}:${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
}

function count(values, key, expected) {
  return values.filter(item => item[key] === expected).length;
}

function percent(part, whole) {
  return whole ? Math.round(part / whole * 1000) / 10 : null;
}

function issueMoments(visit) {
  const moments = visit.moments?.length ? visit.moments : [visit.primary];
  const failures = moments.filter(item => FAILURE_STATUSES.includes(item?.status));
  if (!visit.moments?.length && visit.settleState === "resolved-during-dwell") {
    failures.push(visit.entry);
  }
  return failures.map(item => ({
    resultId: visit.resultId,
    target: visit.target,
    issuePoint: item?.point ?? null,
  }));
}

function sum(values, key) {
  return values.map(item => item[key]).filter(Number.isFinite)
    .reduce((total, value) => total + value, 0);
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
