// FEATURE:      Campus overview merge
// SURFACE:      buildCampusOverview(runs, options)
// WHY TOGETHER: Pooling every run's located evidence onto one geographic grid is one merge contract.
// STATE:        None
// RULES:        Bins pool by geography per floor, never by route axis; direction needs run evidence.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import { buildConcernSegments } from "./report-concern-segments.mjs";
import { reportQuantile } from "./report-samples.mjs";

const LAT_METERS = 110540;
const LNG_METERS = 111320;

export function buildCampusOverview(runs, { binSizeM = 5 } = {}) {
  if (!runs?.length) return { binSizeM, runCount: 0, floors: [], bins: [] };
  const origin = runs[0].result.checkIns[0].groundTruth;
  const lngScale = LNG_METERS * Math.cos(origin.lat * Math.PI / 180);
  const bins = new Map();
  const binAt = point => binFor(bins, origin, lngScale, binSizeM, point);
  for (const { result, analysis } of runs) {
    const runId = result.run.resultId;
    for (const sample of analysis.fixes.samples) {
      if (!sample.groundTruth || !Number.isFinite(sample.accuracyM)) continue;
      const bin = binAt(sample.groundTruth);
      bin.errors.push(sample.accuracyM);
      bin.fixCount += 1;
      bin.runIds.add(runId);
    }
    for (const piece of analysis.stalePathSegments ?? []) {
      const bin = binAt(midpoint(piece.coordinates, piece.z));
      bin.lockSeconds += piece.durationSeconds ?? 0;
      bin.runIds.add(runId);
    }
    const concerns = analysis.concernSegments
      ?? buildConcernSegments(result, analysis);
    for (const segment of concerns) {
      const bin = binAt(midpoint(segment.coordinates, segment.z));
      if (segment.kind === "centre") bin.centreRuns.add(runId);
      if (segment.kind === "approach-forward") bin.forwardRuns.add(runId);
      if (segment.kind === "approach-reverse") bin.reverseRuns.add(runId);
    }
  }
  return {
    binSizeM,
    runCount: runs.length,
    floors: floorUnion(runs),
    bins: [...bins.values()].map(publicBin)
      .sort((left, right) => right.lockSeconds - left.lockSeconds
        || right.runCount - left.runCount),
  };
}

function binFor(bins, origin, lngScale, binSizeM, point) {
  const ix = Math.floor((point.lng - origin.lng) * lngScale / binSizeM);
  const iy = Math.floor((point.lat - origin.lat) * LAT_METERS / binSizeM);
  const key = `${point.z}|${ix}|${iy}`;
  if (!bins.has(key)) {
    bins.set(key, {
      z: point.z,
      lng: origin.lng + (ix + 0.5) * binSizeM / lngScale,
      lat: origin.lat + (iy + 0.5) * binSizeM / LAT_METERS,
      errors: [],
      fixCount: 0,
      lockSeconds: 0,
      runIds: new Set(),
      forwardRuns: new Set(),
      reverseRuns: new Set(),
      centreRuns: new Set(),
    });
  }
  return bins.get(key);
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

function publicBin(bin) {
  const forward = bin.forwardRuns.size;
  const reverse = bin.reverseRuns.size;
  const centre = bin.centreRuns.size;
  return {
    z: bin.z,
    lng: bin.lng,
    lat: bin.lat,
    runCount: bin.runIds.size,
    runIds: [...bin.runIds].sort(),
    fixCount: bin.fixCount,
    lockSeconds: round(bin.lockSeconds),
    medianErrorM: round(reportQuantile(bin.errors, 0.5)),
    forwardRunCount: forward,
    reverseRunCount: reverse,
    centreRunCount: centre,
    bothDirections: centre > 0 || (forward > 0 && reverse > 0),
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
