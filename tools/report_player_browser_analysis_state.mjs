// FEATURE:      Report analysis browser acceptance state
// SURFACE:      activateAnalysisWarnings(page), reportAnalysisFindings(state)
// WHY TOGETHER: Deterministic warning setup and findings define the browser evidence contract.
// STATE:        Short synthetic fixture threshold during one browser scenario
// RULES:        Report banners stay empty; exact geometry, diagnostics, controls, and handoff fail loudly.
// PROVENANCE:   Scope/steps/05b_improve_report.md

export async function activateAnalysisWarnings(page) {
  await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const state = session.store.snapshot();
    session.store.setThresholds({
      stickySeconds: 2,
      accuracyM: state.thresholds.accuracyM,
    });
    session.player.refresh();
  });
}

export function readReportAnalysisState(page) {
  return page.evaluate(async () => {
    const map = window.__reportMapState.map;
    const features = map.sources.get("report-floor-mismatch")?.data?.features ?? [];
    const reported = map.sources.get("report-floor-mismatch-reported")?.data?.features ?? [];
    const wifi = map.sources.get("report-wifi-fixes")?.data?.features ?? [];
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const analysis = session.store.snapshot().analysis;
    const byPoll = values => new Map(values.map(value => [
      value.pollId ?? value.properties.pollId, value,
    ]));
    const wifiByPoll = byPoll(wifi);
    const warningByPair = new Map(analysis.warnings.floorMismatch.points
      .map(point => [`${point.pollId}:${point.atMs}`, point]));
    const reportedByPair = new Map(reported.map(feature => [
      feature.properties.pairId, feature,
    ]));
    const exact = (feature, point) => (
      feature?.geometry.coordinates[0] === point?.lng
      && feature?.geometry.coordinates[1] === point?.lat
    );
    const button = document.querySelector("[data-warning-play]");
    const staleFeatures = map.sources.get("report-stale-path")?.data?.features ?? [];
    const mapAlerts = document.querySelector("[data-module=mapAlerts]");
    return {
      kinds: [...document.querySelectorAll("[data-warning-kind]")]
        .map(item => item.dataset.warningKind),
      text: document.querySelector("[data-module=warnings]")?.textContent ?? "",
      mapAlertText: mapAlerts?.textContent ?? "",
      mapAlertsInsideMap: Boolean(mapAlerts?.closest(".map-stage")),
      diagnosticPanels: document.querySelectorAll(".diagnostic-panel").length,
      insightText: document.querySelector("[data-module=insights]")?.textContent ?? "",
      noPrimaryTimeline: !document.querySelector("[data-module=timeline]"),
      thresholdOptions: {
        accuracy: [...document.querySelector("[data-threshold=accuracyM]").options]
          .map(option => Number(option.value)),
        timeliness: [...document.querySelector("[data-threshold=stickySeconds]").options]
          .map(option => Number(option.value)),
      },
      warningButton: button ? {
        atMs: Number(button.dataset.warningAtMs),
        pollId: button.dataset.warningPollId,
      } : null,
      stalePathPresent: map.sources.has("report-stale-path")
        && map.layers.has("report-stale-path-lyr"),
      stalePathExact: staleFeatures.length === analysis.stalePathSegments.length
        && staleFeatures.every((feature, index) => (
          JSON.stringify(feature.geometry.coordinates)
            === JSON.stringify(analysis.stalePathSegments[index].coordinates)
          && feature.properties.z === analysis.stalePathSegments[index].z
        )),
      wifiPresent: map.sources.has("report-wifi-fixes")
        && map.layers.has("report-wifi-fixes-lyr"),
      wifiExact: wifi.length === analysis.timeline.length
        && analysis.timeline.every(sample => {
          const feature = wifiByPoll.get(sample.pollId);
          return exact(feature, sample.fix) && feature.properties.z === sample.fix.z;
        }),
      mismatchPairsExact: features.length === reported.length
        && features.length > 0
        && features.every(feature => {
          const point = warningByPair.get(feature.properties.pairId);
          const reportedFeature = reportedByPair.get(feature.properties.pairId);
          return exact(feature, point) && feature.properties.z === point?.z
            && exact(reportedFeature, {
              lng: point?.reportedLng,
              lat: point?.reportedLat,
            })
            && reportedFeature?.properties.z === point?.reportedZ;
        }),
      warningFeatures: features.map(feature => ({
        coordinates: feature.geometry.coordinates,
        ...feature.properties,
      })),
    };
  });
}

export function reportAnalysisFindings(state) {
  const findings = [];
  for (const kind of ["stale-position", "floor-mismatch"]) {
    if (!state.kinds?.includes(kind)) findings.push(`Report warning missing ${kind}`);
  }
  if (!/No position update/i.test(state.text)) {
    findings.push("Report no-position-update warning copy is missing");
  }
  if (!/Floor level disconnect/i.test(state.text)) {
    findings.push("Report floor-disconnect warning copy is missing");
  }
  if (!state.mapAlertsInsideMap) findings.push("Shared Player warning slot left the map");
  if ((state.mapAlertText ?? "").trim()) findings.push("Report still shows large map warning banners");
  if (!state.noPrimaryTimeline) findings.push("Report still exposes the primary timeline log");
  if (state.diagnosticPanels !== 4) findings.push("Report does not show all four diagnostic panels");
  if (!/Top no-update locations/i.test(state.insightText)
      || !/Floor changes lag behind/i.test(state.insightText)) {
    findings.push("Report location or floor-lag data is missing");
  }
  if (![15, 20].every(value => state.thresholdOptions?.timeliness?.includes(value))) {
    findings.push("Report timeliness controls lack 15/20 second choices");
  }
  if (![5, 10, 15, 20, 25].every(value => (
    state.thresholdOptions?.accuracy?.includes(value)
  ))) {
    findings.push("Report accuracy controls lack the required metre choices");
  }
  if (!Number.isFinite(state.warningButton?.atMs) || !state.warningButton?.pollId) {
    findings.push("Report warning lacks a Player time/poll handoff");
  } else if (!state.text.includes(state.warningButton.pollId)
      || !state.text.includes(new Date(state.warningButton.atMs).toISOString())) {
    findings.push("Report warning hides its representative poll/time evidence");
  }
  if (!state.wifiPresent) findings.push("Report Wi-Fi fix source/layer is missing");
  if (!state.wifiExact) findings.push("Report Wi-Fi fixes changed timeline lng/lat/z");
  if (!state.stalePathPresent) findings.push("Report stale walked-path source/layer is missing");
  if (!state.stalePathExact) findings.push("Report stale walked path changed truth geometry or z");
  if (!state.mismatchPairsExact) {
    findings.push("Report floor mismatch did not pair truth/reported endpoints on their own z");
  }
  if (!state.warningFeatures?.length) findings.push("Report floor-warning map layer is empty");
  for (const feature of state.warningFeatures ?? []) {
    if (feature.coordinates[0] !== feature.lng || feature.coordinates[1] !== feature.lat) {
      findings.push("Report floor warning changed captured ground-truth coordinates");
    }
    if (feature.z === feature.reportedZ) {
      findings.push("Report floor warning lost its reported/ground-truth mismatch");
    }
  }
  return findings;
}
