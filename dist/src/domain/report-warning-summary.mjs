// FEATURE:      Report warning summaries
// SURFACE:      summarizeWarning, summarizeFloorPairs, publicWarningPoint
// WHY TOGETHER: Episode grouping, representative selection, and floor-pair totals share tie rules.
// STATE:        None
// RULES:        Sort chronologically, merge touching evidence, and round only public values.
// PROVENANCE:   Scope/contracts/report_analysis.md observed positioning behavior

export function summarizeWarning(kind, points, denominatorSeconds) {
  const episodes = buildEpisodes(points);
  const worst = [...episodes].sort(compareWorst)[0] ?? null;
  const affectedSeconds = sum(points, point => point.weightSeconds);
  return {
    kind,
    active: affectedSeconds > 0,
    affectedSeconds: round(affectedSeconds),
    affectedPercent: percent(affectedSeconds, denominatorSeconds),
    episodeCount: episodes.length,
    episodes: episodes.map(publicEpisode),
    sampleCount: new Set(points.map(point => point.pollId)).size,
    worstSeconds: round(worst?.affectedSeconds ?? 0),
    representative: worst
      ? publicWarningPoint(representativePoint(worst.points))
      : null,
  };
}

function publicEpisode(episode) {
  const representative = representativePoint(episode.points);
  const value = {
    startedAtMs: episode.startMs,
    endedAtMs: episode.endMs,
    startedAt: new Date(episode.startMs).toISOString(),
    endedAt: new Date(episode.endMs).toISOString(),
    affectedSeconds: round(episode.affectedSeconds),
    z: representative.z,
    lng: representative.lng,
    lat: representative.lat,
    routeDistanceM: representative.routeDistanceM,
    activeLegId: representative.activeLegId,
    pollId: representative.pollId,
  };
  if (Number.isFinite(representative.reportedZ)) {
    value.reportedZ = representative.reportedZ;
  }
  return value;
}

export function summarizeFloorPairs(points) {
  const pairs = new Map();
  for (const point of points) {
    const key = `${point.z}|${point.reportedZ}`;
    const pair = pairs.get(key) ?? {
      groundTruthZ: point.z,
      reportedZ: point.reportedZ,
      affectedSeconds: 0,
      pollIds: new Set(),
    };
    pair.affectedSeconds += point.weightSeconds;
    pair.pollIds.add(point.pollId);
    pairs.set(key, pair);
  }
  return [...pairs.values()].sort(compareFloorPair).map(pair => ({
    groundTruthZ: pair.groundTruthZ,
    reportedZ: pair.reportedZ,
    affectedSeconds: round(pair.affectedSeconds),
    sampleCount: pair.pollIds.size,
  }));
}

export function publicWarningPoint(point) {
  const value = {
    atMs: point.atMs,
    at: point.at,
    lng: point.lng,
    lat: point.lat,
    z: point.z,
    routeDistanceM: point.routeDistanceM,
    activeLegId: point.activeLegId,
    pollId: point.pollId,
    weightSeconds: round(point.weightSeconds),
  };
  if (Number.isFinite(point.reportedZ)) value.reportedZ = point.reportedZ;
  if ([point.reportedLng, point.reportedLat].every(Number.isFinite)) {
    value.reportedLng = point.reportedLng;
    value.reportedLat = point.reportedLat;
  }
  return value;
}

function buildEpisodes(points) {
  const episodes = [];
  for (const point of [...points].sort(comparePoint)) {
    let episode = episodes.at(-1);
    if (!episode || point.startMs > episode.endMs) {
      episode = {
        startMs: point.startMs,
        endMs: point.endMs,
        affectedSeconds: 0,
        points: [],
      };
      episodes.push(episode);
    }
    episode.endMs = Math.max(episode.endMs, point.endMs);
    episode.affectedSeconds += point.weightSeconds;
    episode.points.push(point);
  }
  return episodes;
}

function representativePoint(points) {
  return [...points].sort((left, right) => (
    right.weightSeconds - left.weightSeconds || comparePoint(left, right)
  ))[0];
}

function comparePoint(left, right) {
  return left.startMs - right.startMs
    || left.endMs - right.endMs
    || left.pollId.localeCompare(right.pollId);
}

function compareWorst(left, right) {
  return right.affectedSeconds - left.affectedSeconds
    || left.startMs - right.startMs
    || left.points[0].pollId.localeCompare(right.points[0].pollId);
}

function compareFloorPair(left, right) {
  return left.groundTruthZ - right.groundTruthZ
    || left.reportedZ - right.reportedZ;
}

function sum(values, select) {
  return values.reduce((total, value) => total + select(value), 0);
}

function percent(part, whole) {
  return whole > 0 ? round(part / whole * 100) : 0;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
