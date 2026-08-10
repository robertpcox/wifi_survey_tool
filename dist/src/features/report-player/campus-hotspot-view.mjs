// FEATURE:      Consolidated geographic hotspot report
// SURFACE:      renderCampusHotspotTables(overview)
// WHY TOGETHER: Held-position, trailing-lag, and distance-error rankings share one table shape.
// STATE:        None
// RULES:        Use each lane's own run count and units; never compare unlike scores.
// PROVENANCE:   Campus-level consolidated report

import { esc } from "../../shared/format.mjs";

export function renderCampusHotspotTables(overview) {
  const floors = new Map(overview.floors.map(floor => [floor.z, floor.name]));
  return `<div class="campus-hotspot-tables">
    ${hotspotTable({
    title: "Raw Cisco positions held while walking",
    detail: "Ranked by accumulated held seconds at the unsnapped Cisco coordinate.",
    bins: ranked(overview.bins, bin => bin.heldSeconds),
    floors, runs: bin => bin.heldRunCount,
    samples: bin => `${one(bin.heldSeconds)} s`,
  })}
    ${hotspotTable({
    title: "Raw Cisco positions trailing the route",
    detail: "Positive lag only, ranked by median metres behind the walked route.",
    bins: ranked(overview.bins, bin => bin.medianLagBehindM),
    floors, runs: bin => bin.lagRunCount,
    samples: bin => `${one(bin.medianLagBehindM)} m · ${bin.lagSampleCount} samples`,
  })}
    ${hotspotTable({
    title: "Positions beyond the distance limit",
    detail: "Only errors beyond the selected threshold enter this ranking.",
    bins: ranked(overview.bins, bin => bin.medianErrorM),
    floors, runs: bin => bin.accuracyRunCount,
    samples: bin => `${one(bin.medianErrorM)} m · ${bin.fixCount} fixes`,
  })}
  </div>`;
}

function hotspotTable({ title, detail, bins, floors, runs, samples }) {
  return `<section><h3>${esc(title)}</h3><p>${esc(detail)}</p>
    <div class="report-table-scroll"><table><thead><tr>
      <th>Floor</th><th>Position</th><th>Runs</th><th>Evidence</th>
    </tr></thead><tbody>${bins.map(bin => `<tr>
      <td>${esc(floors.get(bin.z) ?? `z ${bin.z}`)}</td>
      <td>${esc(bin.lat.toFixed(5))}, ${esc(bin.lng.toFixed(5))}</td>
      <td>${esc(runs(bin))}</td><td>${esc(samples(bin))}</td>
    </tr>`).join("") || '<tr><td colspan="4">No evidence in this lane.</td></tr>'}
    </tbody></table></div></section>`;
}

function ranked(bins, value) {
  return bins.filter(bin => Number(value(bin)) > 0)
    .sort((left, right) => value(right) - value(left)).slice(0, 10);
}

function one(value) {
  return Number.isFinite(value) ? Number(value).toFixed(1) : "—";
}
