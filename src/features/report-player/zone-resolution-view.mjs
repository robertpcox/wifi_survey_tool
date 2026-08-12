// FEATURE:      MazeMap zone-match report
// SURFACE:      renderZoneResolutionView(options)
// WHY TOGETHER: Zone KPIs, sortable outcomes, and failed evidence share one denominator.
// STATE:        None
// RULES:        Score only kind:zone polygons; enclosing room polygons never satisfy a zone match.
// PROVENANCE:   Shared bulk MazeMap POI catalogue and local polygon containment

import { esc } from "../../shared/format.mjs";
import { renderZoneResolutionEvidence }
  from "./zone-resolution-evidence-view.mjs";
import {
  renderZoneResolutionTable, zoneGroupCount,
} from "./zone-resolution-table-view.mjs";

export function renderZoneResolutionView({ summary, showDevice = true }) {
  if (!summary?.observationCount) return `<section class="room-resolution-empty"
    data-area-match="zone"><h3>Zone match outcomes</h3>
    <p>No eligible surveyed stops or walking checkpoints fall inside a MazeMap zone.</p>
  </section>`;
  const totals = outcomeTotals(summary);
  return `<section class="room-resolution-report" data-area-match="zone">
    <header><p class="section-kicker">Raw Cisco versus MazeMap zones</p>
      <h3>Zone match outcomes</h3>
      <p>Zone polygons are scored separately from their enclosing rooms. A match
        succeeds only when the raw Cisco blue dot is inside the expected MazeMap
        <code>kind: zone</code> polygon; room polygons are ignored.</p>
      <p><strong>${esc(summary.runCount ?? 0)} contributing runs:</strong>
        ${esc(summary.observationCount)} eligible zone observations.</p>
    </header>
    <div class="room-resolution-kpis">
      ${card("Inside expected zone", totals.inside, `${totals.scored} scored observations`)}
      ${card("Outside expected zone", totals.outside, "includes a different mapped zone")}
      ${card("Unscored", totals.unscored, "missing Cisco fix or unavailable evidence")}
      ${card("Zones tested", zoneGroupCount(summary), "room polygons excluded")}
    </div>
    ${renderZoneResolutionTable(summary)}${renderZoneResolutionEvidence(summary, { showDevice })}
  </section>`;
}

function outcomeTotals(summary) {
  const corridor = summary.corridor ?? {};
  const inside = number(summary.resolvedVisitCount) + number(corridor.resolvedSampleCount);
  const outside = number(summary.failedVisitCount) + number(corridor.failedSampleCount);
  return { inside, outside, scored: inside + outside,
    unscored: number(summary.unscoredVisitCount) + number(corridor.unscoredSampleCount) };
}

function card(label, value, detail) {
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
