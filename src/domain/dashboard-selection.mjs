// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      URL selection, manifest projection, and Report Player link helpers
// WHY TOGETHER: URL identity and manifest selection jointly define dashboard visibility.
// STATE:        None
// RULES:        Show manifest-owned entries only and offer completed results for launch.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

export function customerIdFromUrl(url) {
  const parsed = url instanceof URL ? url : new URL(url, import.meta.url);
  const queryId = (
    parsed.searchParams.get("customer_id")
    ?? parsed.searchParams.get("customer")
  )?.trim();
  if (queryId) return queryId;
  const parts = parsed.pathname.split("/").filter(Boolean);
  const dashboardIndex = parts.indexOf("dashboard");
  const pathId = dashboardIndex >= 0 ? parts[dashboardIndex + 1] : null;
  return pathId && pathId !== "index.html" ? pathId : null;
}

export function reportPlayerBaseFromUrl(url) {
  const path = (url instanceof URL ? url : new URL(url, import.meta.url)).pathname;
  const sourceMarker = "/src/apps/dashboard/";
  const dashboardMarker = "/dashboard";
  if (path.includes(sourceMarker)) {
    return `${path.slice(0, path.indexOf(sourceMarker))}/src/apps/report-player/`;
  }
  const dashboardIndex = path.indexOf(dashboardMarker);
  const dashboardBoundary = path[dashboardIndex + dashboardMarker.length];
  if (dashboardIndex >= 0 && (!dashboardBoundary || dashboardBoundary === "/")) {
    return `${path.slice(0, dashboardIndex)}/report-player/`;
  }
  const leaf = path.split("/").at(-1);
  const directory = path.endsWith("/") || !leaf.includes(".")
    ? `${path.replace(/\/$/, "")}/`
    : path.slice(0, path.lastIndexOf("/") + 1);
  return `${directory}report-player/`;
}

export function createDashboardModel(manifest, expectedCustomerId) {
  if (manifest?.schemaVersion !== 3) throw new Error("Customer manifest must be v3");
  if (expectedCustomerId && manifest.customerId !== expectedCustomerId) {
    throw new Error("Loaded customer manifest does not match the URL");
  }
  const completed = (manifest.results ?? [])
    .filter(result => result.completionStatus === "completed");
  const campuses = campusGroups(completed.filter(result => !excludedRun(result)));
  const surveys = (manifest.surveys ?? []).map(survey => ({
    ...survey,
    results: completed
      .filter(result => result.surveyId === survey.surveyId)
      .sort((left, right) => right.exportedAt.localeCompare(left.exportedAt))
      .map(result => ({
        resultId: result.resultId,
        surveyId: result.surveyId,
        customerId: result.customerId,
        exportedAt: result.exportedAt,
        band: result.band,
        device: {
          type: result.device?.type,
          os: result.device?.os,
          name: result.device?.name,
        },
        deviceLabel: deviceLabel(result),
      })),
  }));
  return Object.freeze({
    customerId: manifest.customerId,
    customerName: manifest.customerName || manifest.customerId,
    campuses,
    surveys,
  });
}

export function consolidatedReportUrl(campus, base) {
  assertReportPlayerBase(base);
  const params = new URLSearchParams({
    customer_id: campus.customerId,
    campus_id: campus.campusId,
    view: "overview",
  });
  return `${base}?${params}`;
}

export function reportPlayerUrl(result, base) {
  assertReportPlayerBase(base);
  const params = new URLSearchParams({
    customer_id: result.customerId,
    result_id: result.resultId,
  });
  return `${base}?${params}`;
}

function campusGroups(results) {
  const groups = new Map();
  for (const result of results) {
    const campusId = String(result.campusId ?? "").trim();
    if (!campusId) continue;
    if (!groups.has(campusId)) groups.set(campusId, {
      campusId,
      customerId: result.customerId,
      runCount: 0,
      surveyIds: new Set(),
      latestExportedAt: result.exportedAt,
    });
    const group = groups.get(campusId);
    group.runCount += 1;
    group.surveyIds.add(result.surveyId);
    if (result.exportedAt > group.latestExportedAt) {
      group.latestExportedAt = result.exportedAt;
    }
  }
  return [...groups.values()]
    .sort((left, right) => left.campusId.localeCompare(right.campusId))
    .map(group => Object.freeze({
      campusId: group.campusId,
      customerId: group.customerId,
      runCount: group.runCount,
      surveyCount: group.surveyIds.size,
      latestExportedAt: group.latestExportedAt,
    }));
}

function excludedRun(result) {
  return (result.reviewedExceptions ?? [])
    .some(item => item.disposition === "exclude-run");
}

function assertReportPlayerBase(base) {
  if (typeof base !== "string" || !base.endsWith("/")) {
    throw new TypeError("Report Player base must be a directory URL");
  }
}

function deviceLabel(result) {
  const device = result.device ?? {};
  return [
    device.name || "Unnamed device",
    device.type || "unknown type",
    device.os || "unknown OS",
    `${result.band || "unknown"} GHz`,
  ].join(" · ");
}
