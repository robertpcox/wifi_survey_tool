// FEATURE:      Report issue intelligence
// SURFACE:      buildReportInsights(result, analysis)
// WHY TOGETHER: Diagnostic series, floor totals, issue zones, and floor lags share one analysis projection.
// STATE:        None
// RULES:        Use elapsed evidence, keep planned dwell out of no-update totals, and preserve reported floors.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { haversine } from "./geometry.mjs";
import { buildReportCaptureSeries } from "./report-request-insights.mjs";
import { reportQuantile } from "./report-samples.mjs";

export function buildReportInsights(result, analysis) {
  const startedMs = Date.parse(result.run.startedAt);
  const floorNames = new Map(analysis.floors.map(floor => [String(floor.z), floor.name]));
  const stops = routeStops(result.route);
  const capture = buildReportCaptureSeries(result, analysis);
  return Object.freeze({
    ...capture,
    durationSeconds: round(Math.max(0,
      Date.parse(result.run.stoppedAt) - startedMs,
    ) / 1000),
    byFloor: floorSummary(analysis),
    zones: zoneSummary(stops, analysis.heatmaps.sticky),
    floorEpisodes: (analysis.warnings.floorMismatch.episodes ?? []).map(episode => ({
      ...episode,
      elapsedSeconds: round((episode.startedAtMs - startedMs) / 1000),
      actualFloor: floorNames.get(String(episode.z)) ?? `z ${episode.z}`,
      reportedFloor: floorNames.get(String(episode.reportedZ))
        ?? `z ${episode.reportedZ}`,
      near: nearestStop(stops, episode)?.name ?? "Route transition",
    })),
  });
}

function floorSummary(analysis) {
  return analysis.floors.map((floor, index) => {
    const points = analysis.heatmaps.sticky[index]?.points ?? [];
    const errors = analysis.timeline.filter(sample => sample.groundTruth?.z === floor.z)
      .map(sample => sample.accuracyM).filter(Number.isFinite);
    return {
      ...floor,
      affectedSeconds: round(sum(points, point => point.weightSeconds)),
      episodeCount: (analysis.warnings.stalePosition.episodes ?? [])
        .filter(episode => episode.z === floor.z).length,
      medianAccuracyM: round(reportQuantile(errors, 0.5)),
      p95AccuracyM: round(reportQuantile(errors, 0.95)),
    };
  });
}

function zoneSummary(stops, floors) {
  const zones = new Map();
  for (const point of floors.flatMap(floor => floor.points ?? [])) {
    const stop = nearestStop(stops, point);
    const key = stop?.id ?? `floor-${point.z}`;
    const zone = zones.get(key) ?? {
      id: key,
      name: stop?.name ?? `Unlabelled route area · z ${point.z}`,
      z: point.z,
      routeDistanceM: stop?.routeDistanceM ?? point.routeDistanceM,
      affectedSeconds: 0,
      pollIds: new Set(),
    };
    zone.affectedSeconds += point.weightSeconds;
    zone.pollIds.add(point.pollId);
    zones.set(key, zone);
  }
  return [...zones.values()].map(zone => ({
    id: zone.id,
    name: zone.name,
    z: zone.z,
    routeDistanceM: round(zone.routeDistanceM),
    affectedSeconds: round(zone.affectedSeconds),
    sampleCount: zone.pollIds.size,
  })).sort((left, right) => (
    right.affectedSeconds - left.affectedSeconds
    || left.name.localeCompare(right.name)
    || left.id.localeCompare(right.id)
  )).slice(0, 10);
}

function nearestStop(stops, point) {
  return stops.filter(stop => stop.z === point.z).reduce((nearest, stop) => {
    const distanceM = Number.isFinite(point.routeDistanceM)
      ? Math.abs(stop.routeDistanceM - point.routeDistanceM)
      : haversine(stop, point);
    return !nearest || distanceM < nearest.distanceM
      ? { ...stop, distanceM }
      : nearest;
  }, null);
}

function routeStops(route) {
  const distances = new Map();
  const first = route.stops?.[0];
  if (first) distances.set(first.id, 0);
  let distanceM = 0;
  for (const leg of route.legs ?? []) {
    distanceM += leg.distanceM;
    distances.set(leg.toStopId, distanceM);
  }
  return (route.stops ?? []).map(stop => ({
    ...stop,
    routeDistanceM: distances.get(stop.id),
  }));
}

function sum(values, select) {
  return values.reduce((total, value) => total + select(value), 0);
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
