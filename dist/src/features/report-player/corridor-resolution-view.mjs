// FEATURE:      Corridor resolution report
// SURFACE:      renderCorridorResolution(summary)
// WHY TOGETHER: Multi-point corridor KPIs, graph, ranking, and evidence share one denominator.
// STATE:        None
// RULES:        Render raw Cisco containment samples; never infer results from snapped display paths.
// PROVENANCE:   Long-corridor MazeMap area-resolution evidence

import { esc } from "../../shared/format.mjs";

export function renderCorridorResolution(summary) {
  if (!summary?.sampleCount) return `<section class="corridor-resolution-empty">
    <h4>Corridor walking samples</h4>
    <p>No eligible dynamic intermediate marks are present.</p>
  </section>`;
  return `<section class="corridor-resolution-report">
    <div class="section-heading"><div><h4>Corridor walking samples</h4>
      <p>Each intermediate mark contributes one raw Cisco containment sample.
        The whole corridor colour shows the majority outcome across those samples.</p>
    </div><p>${esc(summary.sampleCount)} samples</p></div>
    <div class="room-resolution-kpis corridor-resolution-kpis">
      ${card("Inside expected area", rate(summary.resolutionPercent), `${summary.scoredSampleCount} scored`)}
      ${card("Outside expected area", summary.failedSampleCount, "raw Cisco point outside polygon")}
      ${card("Inside samples", summary.resolvedSampleCount, "green points on the map")}
      ${card("Unscored", summary.unscoredSampleCount, "missing polygon or lookup")}
    </div>
    ${corridorGraph(summary)}
    ${corridorTable(summary)}
    ${corridorEvidence(summary)}
  </section>`;
}

function corridorGraph(summary) {
  return `<figure class="room-issue-graph corridor-resolution-graph">
    <figcaption>Inside-area rate by corridor</figcaption>
    ${summary.corridors.slice(0, 16).map(area => `<div>
      <span>${esc(area.name)}</span>
      <i><b style="width:${area.resolutionPercent ?? 0}%"></b></i>
      <strong>${esc(rate(area.resolutionPercent))}</strong>
    </div>`).join("")}
  </figure>`;
}

function corridorTable(summary) {
  return `<div class="report-table-scroll"><table><thead><tr>
    <th>MazeMap area</th><th>Runs</th><th>Samples</th><th>Inside</th>
    <th>Outside</th><th>Rate</th><th>Failure directions</th>
  </tr></thead><tbody>${summary.corridors.map(area => `<tr>
    <th>${esc(area.name)}</th><td>${esc(area.runCount)}</td>
    <td>${esc(area.samples)}</td><td>${esc(area.resolved)}</td>
    <td>${esc(area.failures)}</td><td>${esc(rate(area.resolutionPercent))}</td>
    <td>${failureDirection(area)}</td>
  </tr>`).join("")}</tbody></table></div>`;
}

function corridorEvidence(summary) {
  const rows = summary.observations.filter(item => !item.resolved).slice(0, 50);
  return `<details class="room-resolution-evidence"><summary>
    Outside and unscored corridor evidence (${esc(rows.length)} shown)</summary>
    <div class="report-table-scroll"><table><thead><tr>
      <th>Run</th><th>Time</th><th>Checkpoint</th><th>Device</th>
      <th>MazeMap area</th><th>Cisco dot</th><th>Outcome</th><th>Direction</th>
    </tr></thead><tbody>${rows.map(item => `<tr>
      <td><code title="${esc(item.resultId)}">${esc(shortId(item.resultId))}</code></td>
      <td>${esc(clock(item.checkedInAt))}</td><th>${esc(item.checkpointId)}</th>
      <td>${esc(item.device?.name || "Unknown")}</td>
      <td>${esc(item.expectedRoom?.name || "Unmapped")}</td>
      <td>${esc(observedArea(item.primary))}</td><td>${esc(item.primary.status)}</td>
      <td>${esc(item.direction || "—")}</td>
    </tr>`).join("") || '<tr><td colspan="8">Every scored sample was inside.</td></tr>'}
    </tbody></table></div></details>`;
}

function card(label, value, detail) {
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}

function rate(value) {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)}%` : "—";
}

function failureDirection(area) {
  if (area.bothFailureDirections) return "Both";
  if (area.forwardFailures) return "Forward";
  if (area.reverseFailures) return "Reverse";
  return "—";
}

function position(point) {
  return point ? `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}` : "No position";
}

function observedArea(moment) {
  return moment?.room?.name || moment?.room?.id || position(moment?.point);
}

function shortId(value) {
  return String(value ?? "—").slice(0, 8);
}

function clock(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(11, 19) : "—";
}
