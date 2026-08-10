// FEATURE:      Campus overview merge
// SURFACE:      buildCampusOverview(runs, options)
// WHY TOGETHER: Pooling every run's located evidence onto one geographic grid is one merge contract.
// STATE:        None
// RULES:        Bins pool by geography per floor, never by route axis; direction needs run evidence.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import { buildConcernSegments } from "./report-concern-segments.mjs";
import { createCampusGrid } from "./report-campus-grid.mjs";
import { campusCiscoWalkingEvidence }
  from "./report-campus-position-evidence.mjs";
import { campusRunMetrics, campusRunSummaries }
  from "./report-campus-runs.mjs";
import { weightedPathPoints } from "./report-path-weights.mjs";

export function buildCampusOverview(runs, { binSizeM = 5 } = {}) {
  if (!runs?.length) return {
    binSizeM, runCount: 0, runs: [], metrics: campusRunMetrics([]),
    floors: [], bins: [], stalePathSegments: [],
  };
  const origin = runs[0].result.checkIns[0].groundTruth;
  const grid = createCampusGrid(origin, binSizeM);
  const binAt = grid.at;
  const stalePathSegments = [];
  for (const { result, analysis } of runs) {
    const runId = result.run.resultId;
    for (const sample of analysis.fixes.samples) {
      if (!sample.groundTruth || !Number.isFinite(sample.accuracyM)
          || sample.accuracyM <= analysis.thresholds.accuracyM) continue;
      const bin = binAt(sample.groundTruth);
      bin.errors.push(sample.accuracyM);
      bin.fixCount += 1;
      bin.runIds.add(runId);
      bin.accuracyRunIds.add(runId);
    }
    for (const piece of analysis.stalePathSegments ?? []) {
      const weightSeconds = Number(piece.durationSeconds);
      stalePathSegments.push({
        ...piece,
        resultId: runId,
        weightSeconds: Number.isFinite(weightSeconds) ? weightSeconds : 0,
      });
      for (const sample of weightedPathPoints(
        piece.coordinates, piece.z, piece.durationSeconds, binSizeM / 2,
      )) {
        const bin = binAt(sample.point);
        bin.lockSeconds += sample.weight;
        bin.runIds.add(runId);
        bin.lockRunIds.add(runId);
      }
    }
    const walking = campusCiscoWalkingEvidence(analysis);
    for (const item of walking.held) {
      const bin = binAt(item.point);
      bin.heldSeconds += item.seconds;
      bin.runIds.add(runId);
      bin.heldRunIds.add(runId);
    }
    for (const item of walking.lag) {
      const bin = binAt(item.point);
      bin.lags.push(item.lagBehindM);
      bin.runIds.add(runId);
      bin.lagRunIds.add(runId);
    }
    const concerns = analysis.concernSegments
      ?? buildConcernSegments(result, analysis);
    for (const segment of concerns) {
      const bin = binAt(midpoint(segment.coordinates, segment.z));
      if (segment.kind === "centre") bin.centreRuns.add(runId);
      if (segment.kind === "approach-forward") bin.forwardRuns.add(runId);
      if (segment.kind === "approach-reverse") bin.reverseRuns.add(runId);
      bin.runIds.add(runId);
    }
  }
  return {
    binSizeM,
    runCount: runs.length,
    runs: campusRunSummaries(runs),
    metrics: campusRunMetrics(runs),
    floors: floorUnion(runs),
    stalePathSegments,
    bins: grid.values()
      .sort((left, right) => right.lockSeconds - left.lockSeconds
        || right.lockRunCount - left.lockRunCount),
  };
}

function midpoint(coordinates, z) {
  const first = coordinates[0];
  const last = coordinates.at(-1);
  return {
    lng: (Number(first[0]) + Number(last[0])) / 2,
    lat: (Number(first[1]) + Number(last[1])) / 2,
    z,
  };
}

function floorUnion(runs) {
  const names = new Map();
  for (const { result } of runs) {
    for (const z of result.meta.zLevels ?? []) {
      if (!names.has(z)) names.set(z, result.meta.zLevelNames?.[String(z)] ?? `z ${z}`);
    }
  }
  return [...names.entries()]
    .sort((left, right) => left[0] - right[0])
    .map(([z, name]) => ({ z, name }));
}
