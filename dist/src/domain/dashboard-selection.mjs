// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      customerIdFromUrl(url), createDashboardModel(manifest), reportPlayerUrl(entry)
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

export function createDashboardModel(manifest, expectedCustomerId) {
  if (manifest?.schemaVersion !== 3) throw new Error("Customer manifest must be v3");
  if (expectedCustomerId && manifest.customerId !== expectedCustomerId) {
    throw new Error("Loaded customer manifest does not match the URL");
  }
  const completed = (manifest.results ?? [])
    .filter(result => result.completionStatus === "completed");
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
    surveys,
  });
}

export function reportPlayerUrl(result, base = "../report-player/") {
  const params = new URLSearchParams({
    customer_id: result.customerId,
    result_id: result.resultId,
  });
  return `${base}?${params}`;
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
