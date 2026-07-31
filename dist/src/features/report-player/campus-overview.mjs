// FEATURE:      Campus overview surface
// SURFACE:      buildCampusOverviewModel(options), overviewMapAnalysis(overview), renderCampusOverviewPanel(options)
// WHY TOGETHER: Merged-bin modelling and its map/table presentation form one overview mode.
// STATE:        None
// RULES:        The merged picture reuses the shared map layers; per-run pages stay unchanged.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { buildCampusOverview } from "../../domain/report-campus-overview.mjs";
import { esc } from "../../shared/format.mjs";

export function buildCampusOverviewModel({
  result,
  analysis,
  thresholds,
  others,
  analyze = analyzeReportResult,
}) {
  const model = buildCampusOverview([
    { result, analysis },
    ...others.map(other => ({ result: other, analysis: analyze(other, thresholds) })),
  ]);
  return { model, mapAnalysis: overviewMapAnalysis(model) };
}

export function overviewMapAnalysis(overview) {
  const heatFloors = weight => overview.floors.map(floor => ({
    ...floor,
    points: overview.bins
      .filter(bin => bin.z === floor.z && weight(bin) > 0)
      .map(bin => ({
        lng: bin.lng,
        lat: bin.lat,
        z: bin.z,
        weightSeconds: weight(bin),
        runCount: bin.runCount,
      })),
  }));
  return {
    floors: overview.floors,
    heatmaps: {
      sticky: heatFloors(bin => bin.lockSeconds),
      accuracy: heatFloors(bin => bin.medianErrorM ?? 0),
    },
    concernSegments: overview.bins
      .filter(bin => bin.lockSeconds > 0
        && (bin.bothDirections || bin.forwardRunCount || bin.reverseRunCount))
      .map(bin => binSegment(bin, overview.binSizeM)),
    stalePathSegments: [],
    timeline: [],
    warnings: { floorMismatch: { points: [] } },
  };
}

export function renderCampusOverviewPanel({ overview, entryCount, loaded }) {
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Campus overview</p>
        <h2>Problem areas merged across every run</h2>
      </div>
      <p>${esc(entryCount + 1)} campus run(s) available</p>
    </div>
    <p class="diagnostic-intro">
      Every campus result is pooled onto a 5 m geographic grid per floor —
      lock time, direction evidence, and fix error merge across runs, devices,
      and days. The map above paints the merged picture; switch floors beside it.
    </p>
    ${loaded ? overviewTable(overview) : `
      <button type="button" data-load-overview>
        Load and merge all ${esc(entryCount + 1)} campus runs</button>
      <p data-overview-status>Nothing is loaded yet.</p>`}`;
}

function overviewTable(overview) {
  const floorNames = new Map(overview.floors.map(floor => [floor.z, floor.name]));
  const worst = overview.bins.filter(bin => bin.lockSeconds > 0).slice(0, 12);
  const rows = worst.map(bin => `<tr>
      <td>${esc(floorNames.get(bin.z) ?? `z ${bin.z}`)}</td>
      <td>${esc(bin.lat.toFixed(5))}, ${esc(bin.lng.toFixed(5))}</td>
      <td>${esc(bin.runCount)}</td>
      <td>${esc(bin.lockSeconds.toFixed(1))} s</td>
      <td>${esc(Number.isFinite(bin.medianErrorM) ? `${bin.medianErrorM.toFixed(1)} m` : "—")}</td>
      <td>${bin.bothDirections ? "Both directions" : "One direction"}</td>
    </tr>`).join("");
  return `
    <p class="request-summary${overview.bins.some(bin => bin.bothDirections) ? "" : " is-clear"}">
      ${esc(overview.runCount)} runs merged ·
      ${esc(overview.bins.filter(bin => bin.lockSeconds > 0).length)} lock bins ·
      ${esc(overview.bins.filter(bin => bin.bothDirections).length)} both-direction spots
    </p>
    <div class="report-table-scroll">
      <table>
        <thead><tr>
          <th>Floor</th><th>Position</th><th>Runs</th><th>Lock</th>
          <th>Median err</th><th>Directions</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No merged lock evidence.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function binSegment(bin, binSizeM) {
  const dLat = binSizeM / 2 / 110540;
  const dLng = binSizeM / 2 / (111320 * Math.cos(bin.lat * Math.PI / 180));
  return {
    kind: bin.bothDirections
      ? "centre"
      : (bin.forwardRunCount >= bin.reverseRunCount
        ? "approach-forward"
        : "approach-reverse"),
    direction: bin.bothDirections
      ? "both"
      : (bin.forwardRunCount >= bin.reverseRunCount ? "forward" : "reverse"),
    pairId: `concern:merged:${bin.z}:${bin.lat.toFixed(6)}:${bin.lng.toFixed(6)}`,
    z: bin.z,
    coordinates: [
      [bin.lng - dLng, bin.lat - dLat],
      [bin.lng + dLng, bin.lat + dLat],
    ],
    runCount: bin.runCount,
    lockSeconds: bin.lockSeconds,
    medianErrorM: bin.medianErrorM,
  };
}
