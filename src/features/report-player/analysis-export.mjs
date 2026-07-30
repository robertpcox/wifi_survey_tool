// FEATURE:      Report Player analysis export
// SURFACE:      createAnalysisSummary, createAnalysisExports, downloadAnalysisExports, buildAnalysisCsv
// WHY TOGETHER: Summary projection, safe CSV, and download descriptors describe one shared analysis.
// STATE:        None
// RULES:        Protect CSV cells, export all three fix lanes, and never mutate result or analysis.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

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
    fixes: {
      accuracy: { ...(analysis?.fixes?.accuracy ?? {}) },
      freshness: { ...(analysis?.fixes?.freshness ?? {}) },
      availability: { ...(analysis?.fixes?.availability ?? {}) },
    },
    noPositionEpisodes: (analysis?.fixes?.noPosition?.episodes ?? [])
      .map(episode => ({ ...episode })),
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
  for (const [lane, metrics] of Object.entries(summary.fixes)) {
    for (const [metric, value] of Object.entries(metrics)) {
      rows.push([`fix-${lane}`, "", metric, value, metricUnit(metric)]);
    }
  }
  for (const episode of summary.noPositionEpisodes) {
    rows.push([
      "no-position-episode",
      episode.z ?? "",
      episode.startedAt,
      episode.durationSeconds,
      "seconds",
    ]);
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
