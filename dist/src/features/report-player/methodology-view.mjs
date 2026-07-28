// FEATURE:      Report Player methodology and analysis export
// SURFACE:      renderMethodologyView(options), createAnalysisExports(result, analysis)
// WHY TOGETHER: Method explanations and exports describe the same shared analysis.
// STATE:        None
// RULES:        Use meta floors, protect CSV cells, and never mutate result or analysis.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

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
        <h3>Sticky position</h3>
        <p>
          Sticky time is elapsed time after a fix remains unchanged for more than
          <strong>${esc(sticky)} seconds</strong> while ground truth is moving.
          Planned checkpoint dwell is excluded. Heat is weighted by elapsed seconds
          and placed at the interpolated ground-truth location.
        </p>
      </article>
      <article>
        <h3>Outside accuracy</h3>
        <p>
          Accuracy time is elapsed time where the fix is more than
          <strong>${esc(accuracy)} metres</strong> from ground truth. Heat is placed
          at ground truth, not at the reported fix.
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

export function createAnalysisSummary(result, analysis) {
  return {
    schemaVersion: 1,
    result: {
      resultId: result?.run?.resultId ?? null,
      surveyId: result?.run?.surveyId ?? null,
      routeHash: result?.run?.routeHash ?? null,
    },
    thresholds: { ...(analysis?.thresholds ?? {}) },
    floors: (analysis?.floors ?? []).map(({ z, name }) => ({ z, name })),
    metrics: { ...(analysis?.metrics ?? {}) },
    heatmaps: ["sticky", "accuracy"].flatMap(kind => (
      summarizeHeat(kind, analysis?.heatmaps?.[kind] ?? [])
    )),
  };
}

export function createAnalysisExports(result, analysis) {
  const summary = createAnalysisSummary(result, analysis);
  const base = safeFilePart(result?.run?.resultId);
  return {
    csv: {
      filename: `${base}.analysis.csv`,
      content: buildAnalysisCsv(summary),
      mediaType: "text/csv",
    },
    json: {
      filename: `${base}.analysis.json`,
      content: `${JSON.stringify(summary, null, 2)}\n`,
      mediaType: "application/json",
    },
  };
}

export function downloadAnalysisExports({ result, analysis, downloadFile }) {
  if (typeof downloadFile !== "function") throw new TypeError("downloadFile must be a function");
  const files = createAnalysisExports(result, analysis);
  for (const file of Object.values(files)) {
    downloadFile(file.filename, file.content, file.mediaType);
  }
  return files;
}

export function buildAnalysisCsv(summary) {
  const rows = [["section", "floor", "metric", "value", "unit"]];
  for (const [metric, value] of Object.entries(summary.result)) {
    rows.push(["result", "", metric, value, ""]);
  }
  for (const [metric, value] of Object.entries(summary.thresholds)) {
    rows.push(["threshold", "", metric, value, metricUnit(metric)]);
  }
  for (const [metric, value] of Object.entries(summary.metrics)) {
    rows.push(["metric", "", metric, value, metricUnit(metric)]);
  }
  for (const heat of summary.heatmaps) {
    rows.push(["heatmap", heat.floor, heat.kind, heat.seconds, "seconds"]);
  }
  return `${rows.map(row => row.map(analysisCsvCell).join(",")).join("\r\n")}\r\n`;
}

function summarizeHeat(kind, floors) {
  return floors.map(floor => ({
    kind,
    z: floor.z,
    floor: floor.name,
    pointCount: (floor.points ?? []).length,
    seconds: (floor.points ?? []).reduce((total, point) => (
      total + (Number(point.weightSeconds) || 0)
    ), 0),
  }));
}

function analysisCsvCell(value) {
  const text = String(value ?? "");
  const protectedText = typeof value === "string" && /^\s*[=+\-@]/.test(text)
    ? `'${text}`
    : text;
  return `"${protectedText.replaceAll('"', '""')}"`;
}

function metricUnit(metric) {
  if (metric.endsWith("Percent")) return "percent";
  if (metric.endsWith("Seconds")) return "seconds";
  if (metric.endsWith("Ms")) return "milliseconds";
  if (metric.endsWith("M")) return "metres";
  return "count";
}

function safeFilePart(value) {
  return String(value || "report-analysis").replace(/[^a-zA-Z0-9._-]+/g, "-");
}

function floorName(meta, z) {
  const name = meta.zLevelNames?.[String(z)];
  if (typeof name !== "string" || !name.trim()) {
    throw new TypeError(`meta.zLevelNames.${z} must name the floor`);
  }
  return name;
}
