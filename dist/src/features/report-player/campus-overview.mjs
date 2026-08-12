// FEATURE:      Campus overview surface
// SURFACE:      buildCampusOverviewModel(options), overviewMapAnalysis(overview), renderCampusOverviewPanel(options)
// WHY TOGETHER: Merged-bin modelling and its map/table presentation form one overview mode.
// STATE:        None
// RULES:        The merged picture reuses the shared map layers; per-run pages stay unchanged.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { buildCampusOverview } from "../../domain/report-campus-overview.mjs";
import { esc } from "../../shared/format.mjs";
import { renderCampusHotspotTables } from "./campus-hotspot-view.mjs";
import { renderCampusRunSummary } from "./campus-run-summary-view.mjs";

export function buildCampusOverviewModel({
  result,
  analysis,
  thresholds,
  others,
  includeResult = true,
  analyze = analyzeReportResult,
}) {
  const model = buildCampusOverview([
    ...(includeResult ? [{ result, analysis }] : []),
    ...others.map(other => {
      const record = other?.result ? other : { result: other, exceptions: [] };
      return {
        result: record.result,
        analysis: analyze(record.result, thresholds, record.exceptions ?? []),
      };
    }),
  ]);
  return { model, mapAnalysis: overviewMapAnalysis(model) };
}

export function overviewMapAnalysis(overview, roomSummary = null) {
  const heatFloors = (weight, runs) => overview.floors.map(floor => ({
    ...floor,
    points: overview.bins
      .filter(bin => bin.z === floor.z && weight(bin) > 0)
      .map(bin => ({
        lng: bin.lng,
        lat: bin.lat,
        z: bin.z,
        weight: weight(bin),
        runCount: runs(bin),
      })),
  }));
  return {
    overview: true,
    floors: overview.floors,
    fitPoints: [
      ...overview.bins,
      ...(roomSummary?.truthIssuePoints ?? []),
      ...(roomSummary?.ciscoIssuePoints ?? []),
    ],
    heatmaps: {
      freeze: overview.floors.map(floor => ({ ...floor, points: [] })),
      sticky: heatFloors(bin => bin.heldSeconds, bin => bin.heldRunCount),
      lag: heatFloors(bin => bin.medianLagBehindM ?? 0, bin => bin.lagRunCount),
      accuracy: heatFloors(bin => bin.medianErrorM ?? 0, bin => bin.accuracyRunCount),
      room: overview.floors.map(floor => ({ ...floor, points: [] })),
    },
    concernSegments: [],
    stalePathSegments: overview.stalePathSegments ?? [],
    timeline: [],
    warnings: { floorMismatch: { points: [] } },
    areaResolution: roomSummary,
  };
}

export function renderCampusOverviewPanel({
  overview,
  entryCount,
  failureCount = 0,
  includeCurrent = true,
  selectedCount = null,
  loaded,
  priorityHtml = "",
}) {
  const availableCount = entryCount + Number(includeCurrent);
  const includedCount = selectedCount ?? availableCount;
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Campus overview</p>
        <h2>Problem areas across selected runs</h2>
      </div>
      <p>${esc(includedCount)} selected of ${esc(availableCount)} available</p>
    </div>
    <p class="diagnostic-intro">
      Selected eligible campus results are pooled per floor. Separate highlights show
      frozen walked-path sections, the raw Cisco positions that stayed held,
      movement lag, distance error, and MazeMap room/corridor containment.
      Reviewed exclusions are applied before runs are merged.
    </p>
    ${priorityHtml}
    ${loaded ? overviewTable(overview, failureCount) : `
      <button type="button" data-load-overview>
        Load and merge ${esc(includedCount)} selected campus runs</button>
      <p data-overview-status>Nothing is loaded yet.</p>`}`;
}

function overviewTable(overview, failureCount) {
  const floorNames = new Map(overview.floors.map(floor => [floor.z, floor.name]));
  const worst = overview.bins.filter(bin => bin.lockSeconds > 0).slice(0, 12);
  const rows = worst.map(bin => `<tr>
      <td>${esc(floorNames.get(bin.z) ?? `z ${bin.z}`)}</td>
      <td>${esc(bin.lat.toFixed(5))}, ${esc(bin.lng.toFixed(5))}</td>
      <td>${esc(bin.lockRunCount)}</td>
      <td>${esc(bin.lockSeconds.toFixed(1))} s</td>
      <td>${esc(Number.isFinite(bin.medianErrorM) ? `${bin.medianErrorM.toFixed(1)} m` : "—")}</td>
      <td>${bin.bothDirections ? "Both directions" : "One direction"}</td>
    </tr>`).join("");
  return `
    <p class="request-summary${overview.bins.some(bin => bin.bothDirections) ? "" : " is-clear"}">
      ${esc(overview.runCount)} runs merged ·
      ${esc(overview.bins.filter(bin => bin.lockSeconds > 0).length)} lock bins ·
      ${esc(overview.bins.filter(bin => bin.bothDirections).length)} both-direction spots
      ${failureCount ? ` · ${esc(failureCount)} run(s) unavailable` : ""}
    </p>
    ${renderCampusRunSummary(overview)}
    <h3>Frozen walked-path sections</h3>
    <div class="report-table-scroll">
      <table>
        <thead><tr>
          <th>Floor</th><th>Position</th><th>Runs</th><th>Lock</th>
          <th>Median err</th><th>Directions</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="6">No merged lock evidence.</td></tr>'}</tbody>
      </table>
    </div>
    ${renderCampusHotspotTables(overview)}`;
}
