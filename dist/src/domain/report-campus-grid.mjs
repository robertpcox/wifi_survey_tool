// FEATURE:      Consolidated campus geographic grid
// SURFACE:      createCampusGrid(origin, binSizeM)
// WHY TOGETHER: Stable cell addressing, lane evidence sets, and public values share one grid.
// STATE:        Mutable bins private to one overview build
// RULES:        Keep accuracy, freeze, held, and lag run counts independent.
// PROVENANCE:   Campus-level consolidated report

import { reportQuantile } from "./report-samples.mjs";

const LAT_METERS = 110540;
const LNG_METERS = 111320;

export function createCampusGrid(origin, binSizeM) {
  const lngScale = LNG_METERS * Math.cos(origin.lat * Math.PI / 180);
  const bins = new Map();

  function at(point) {
    const ix = Math.floor((point.lng - origin.lng) * lngScale / binSizeM);
    const iy = Math.floor((point.lat - origin.lat) * LAT_METERS / binSizeM);
    const key = `${point.z}|${ix}|${iy}`;
    if (!bins.has(key)) bins.set(key, createBin(origin, lngScale, binSizeM, point, ix, iy));
    return bins.get(key);
  }

  return Object.freeze({
    at,
    values: () => [...bins.values()].map(publicBin),
  });
}

function createBin(origin, lngScale, binSizeM, point, ix, iy) {
  return {
    z: point.z,
    lng: origin.lng + (ix + 0.5) * binSizeM / lngScale,
    lat: origin.lat + (iy + 0.5) * binSizeM / LAT_METERS,
    errors: [],
    fixCount: 0,
    lockSeconds: 0,
    heldSeconds: 0,
    lags: [],
    runIds: new Set(),
    accuracyRunIds: new Set(),
    lockRunIds: new Set(),
    heldRunIds: new Set(),
    lagRunIds: new Set(),
    forwardRuns: new Set(),
    reverseRuns: new Set(),
    centreRuns: new Set(),
  };
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
    lockRunCount: bin.lockRunIds.size,
    heldSeconds: round(bin.heldSeconds),
    heldRunCount: bin.heldRunIds.size,
    accuracyRunCount: bin.accuracyRunIds.size,
    medianErrorM: round(reportQuantile(bin.errors, 0.5)),
    medianLagBehindM: round(reportQuantile(bin.lags, 0.5)),
    lagRunCount: bin.lagRunIds.size,
    lagSampleCount: bin.lags.length,
    forwardRunCount: forward,
    reverseRunCount: reverse,
    centreRunCount: centre,
    bothDirections: centre > 0 || (forward > 0 && reverse > 0),
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
