// FEATURE:      Report Player methodology and analysis export
// SURFACE:      renderMethodologyView(options) and re-exported analysis export helpers
// WHY TOGETHER: Method explanations sit beside the export actions they describe.
// STATE:        None
// RULES:        Use meta floors and never mutate result or analysis.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export {
  buildAnalysisCsv,
  createAnalysisExports,
  createAnalysisSummary,
  downloadAnalysisExports,
} from "./analysis-export.mjs";

export function renderMethodologyView({ result, analysis }) {
  const { stickySeconds: sticky, accuracyM: accuracy } = analysis?.thresholds ?? {};
  const floors = (result?.meta?.zLevels ?? []).map(z => (
    `${floorName(result.meta, z)} (z ${z})`
  ));
  return `
    <section class="report-methodology" aria-labelledby="methodology-title">
      <header>
        <p class="eyebrow">How this report is calculated</p>
        <h2 id="methodology-title">Methodology and export</h2>
      </header>
      <article>
        <h3>Accuracy · unique fixes</h3>
        <p>
          Accuracy statistics use each unique provider fix once, scored against
          route ground truth at its <strong>fix time</strong> and compared with
          the provider's own confidence radius. Repeated polls of a held fix
          count as freshness evidence, not extra error samples.
        </p>
      </article>
      <article>
        <h3>No position update</h3>
        <p>
          No-update time is elapsed time after a fix remains unchanged for more than
          <strong>${esc(sticky)} seconds</strong> while ground truth is moving.
          Planned checkpoint dwell is excluded. Endpoint recording is stationary
          evidence, not route movement. Heat uses interpolated ground truth.
        </p>
      </article>
      <article>
        <h3>Outside accuracy</h3>
        <p>
          Accuracy time is elapsed time where the served fix is more than
          <strong>${esc(accuracy)} metres</strong> from ground truth at receipt,
          so it includes delivery lag. Heat is placed at ground truth.
        </p>
      </article>
      <article>
        <h3>Floors</h3>
        <p>Heat is separated using only the survey meta floors:</p>
        <ul>${floors.map(name => `<li>${esc(name)}</li>`).join("")}</ul>
      </article>
      <div class="report-export-actions">
        <button type="button" data-action="export-analysis-csv">Export CSV</button>
        <button type="button" data-action="export-analysis-json">Export JSON</button>
      </div>
    </section>`;
}

function floorName(meta, z) {
  const name = meta.zLevelNames?.[String(z)];
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError(`meta.zLevelNames.${z} must name the floor`);
  }
  return name;
}
