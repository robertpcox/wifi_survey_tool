// FEATURE:      Report evidence warnings
// SURFACE:      renderReportWarnings(analysis), bindReportWarningActions(root, open)
// WHY TOGETHER: Prominent warning summaries and their Player handoff share one interaction.
// STATE:        None
// RULES:        Describe observed evidence only and use result-meta floor names.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { esc } from "../../shared/format.mjs";

export function renderReportWarnings(analysis) {
  const stale = analysis?.warnings?.stalePosition;
  const floor = analysis?.warnings?.floorMismatch;
  const reviewed = (analysis?.reviewedExceptions ?? [])
    .filter(item => item.disposition !== "include");
  const cards = [
    ...reviewed.map(reviewedExceptionCard),
    stale?.active && warningCard({
      kind: "stale-position",
      title: "No position update",
      summary: `The reported fix stayed unchanged beyond ${analysis.thresholds.stickySeconds} s while the tester was moving.`,
      warning: stale,
    }),
    floor?.active && warningCard({
      kind: "floor-mismatch",
      title: "Floor level disconnect",
      summary: floorSummary(floor, analysis?.floors),
      warning: floor,
    }),
  ].filter(Boolean);
  if (!cards.length) {
    return `<section class="report-warning-summary is-clear" data-warning-state="clear">
      <p class="section-kicker">Observed warnings</p>
      <strong>No position-update or floor-level mismatch warning was detected.</strong>
    </section>`;
  }
  return `<section class="report-warning-summary" data-warning-state="active"
      aria-labelledby="report-warning-title">
    <header>
      <p class="section-kicker">Observed warnings</p>
      <h2 id="report-warning-title">Positioning evidence needs attention</h2>
    </header>
    <div class="report-warning-grid">${cards.join("")}</div>
  </section>`;
}

function reviewedExceptionCard(exception) {
  const anchor = exception.routeAnchor;
  return `<article class="report-warning-card reviewed-exception"
      data-warning-kind="reviewed-exception" role="status">
    <div>
      <strong>Reviewed data exclusion</strong>
      <p>${esc(exception.reason)}</p>
    </div>
    <dl>
      <div><dt>From</dt><dd>${esc(anchor.fromCheckpointId)}</dd></div>
      <div><dt>To</dt><dd>${esc(anchor.toCheckpointId)}</dd></div>
      <div><dt>Excluded</dt><dd>${esc(formatSeconds(exception.excludedSeconds))}</dd></div>
      <div><dt>Route</dt><dd>${esc(formatMetres(exception.excludedDistanceM))}</dd></div>
    </dl>
    <p class="warning-evidence">Raw capture and Player playback are preserved.</p>
  </article>`;
}

export function bindReportWarningActions(root, open) {
  const buttons = [...root.querySelectorAll("[data-warning-play]")];
  for (const button of buttons) {
    button.addEventListener("click", () => open({
      atMs: Number(button.dataset.warningAtMs),
      pollId: button.dataset.warningPollId || null,
    }));
  }
  return buttons.length;
}

function warningCard({ kind, title, summary, warning }) {
  const representative = warning.representative;
  const evidence = representative
    ? `<p class="warning-evidence">Evidence:
        <time datetime="${esc(evidenceTime(representative))}">${esc(evidenceTime(representative))}</time>
        · poll ${esc(representative.pollId ?? "unknown")}</p>`
    : "";
  const play = Number.isFinite(representative?.atMs)
    ? `<button type="button" data-warning-play
        data-warning-at-ms="${esc(representative.atMs)}"
        data-warning-poll-id="${esc(representative.pollId ?? "")}">
        Open worst moment in Player
      </button>`
    : "";
  return `<article class="report-warning-card ${esc(kind)}"
      data-warning-kind="${esc(kind)}" role="alert">
    <div>
      <strong>${esc(title)}</strong>
      <p>${esc(summary)}</p>
    </div>
    <dl>
      <div><dt>Affected</dt><dd>${esc(formatSeconds(warning.affectedSeconds))}</dd></div>
      <div><dt>Share</dt><dd>${esc(formatPercent(warning.affectedPercent))}</dd></div>
      <div><dt>Episodes</dt><dd>${esc(warning.episodeCount)}</dd></div>
      <div><dt>Worst</dt><dd>${esc(formatSeconds(warning.worstSeconds))}</dd></div>
    </dl>
    ${evidence}
    ${play}
  </article>`;
}

function floorSummary(warning, floors = []) {
  const pair = warning.representative ?? warning.floorPairs?.[0];
  if (!pair) return "The reported floor differed from inferred route ground truth.";
  const names = new Map(floors.map(floor => [String(floor.z), floor.name]));
  const groundTruthZ = pair.groundTruthZ ?? pair.z;
  const route = names.get(String(groundTruthZ)) ?? `z ${groundTruthZ}`;
  const reported = names.get(String(pair.reportedZ)) ?? `z ${pair.reportedZ}`;
  return `Reported ${reported} while route ground truth was ${route}.`;
}

function evidenceTime(representative) {
  return representative.at
    ?? new Date(representative.atMs).toISOString();
}

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : "—";
}

function formatSeconds(value) {
  if (!Number.isFinite(value)) return "—";
  const seconds = Math.round(value);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainder = seconds % 60;
  if (hours) return `${hours} h ${minutes} m ${remainder} s`;
  if (minutes) return `${minutes} m ${remainder} s`;
  return `${value.toFixed(1)} s`;
}

function formatMetres(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} m` : "—";
}
