// FEATURE:      Report analysis browser acceptance
// SURFACE:      exerciseReportAnalysis(page, fixture), reportAnalysisFindings(state)
// WHY TOGETHER: Access, warnings, native floor switching, and Player handoff form one Report path.
// STATE:        One fake-SDK Report page and its shared map
// RULES:        Native MazeMap z-level is authoritative and captured warning geometry stays exact.
// PROVENANCE:   Scope/steps/05b_improve_report.md

const FLOOR_LAYER_IDS = ["report-sticky-heat-lyr", "report-floor-mismatch-lyr", "report-floor-mismatch-reported-lyr", "report-wifi-fixes-lyr"];
export async function exerciseReportAnalysis(page, fixture) {
  const failures = [];
  await page.click("[data-toggle-map-access]");
  await page.type("[data-map-access]", ["report", "runtime", "value"].join("-"));
  const access = await page.evaluate(() => ({
    expanded: document.querySelector("[data-toggle-map-access]").getAttribute("aria-expanded"),
    hidden: document.querySelector("[data-map-access-panel]").hidden,
    typed: Boolean(document.querySelector("[data-map-access]").value),
  }));
  if (access.hidden || access.expanded !== "true" || !access.typed) failures.push("Report could not open the shared map access token control");
  await page.$eval("[data-map-access]", input => { input.value = ""; });
  await page.click("[data-toggle-map-access]");
  const warningState = await page.evaluate(async () => {
    const map = window.__reportMapState.map;
    const features = map.sources.get("report-floor-mismatch")?.data?.features ?? [];
    const reportedFeatures = map.sources
      .get("report-floor-mismatch-reported")?.data?.features ?? [];
    const wifi = map.sources.get("report-wifi-fixes")?.data?.features ?? [];
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const analysis = session.store.snapshot().analysis;
    const timeline = analysis.timeline;
    const byPoll = values => new Map(values.map(value => [value.pollId ?? value.properties.pollId, value]));
    const wifiByPoll = byPoll(wifi);
    const warningByPair = new Map(analysis.warnings.floorMismatch.points
      .map(point => [`${point.pollId}:${point.atMs}`, point]));
    const reportedByPair = new Map(reportedFeatures.map(feature => [feature.properties.pairId, feature]));
    const exact = (feature, point) => feature?.geometry.coordinates[0] === point?.lng && feature?.geometry.coordinates[1] === point?.lat;
    const button = document.querySelector("[data-warning-play]");
    return {
      kinds: [...document.querySelectorAll("[data-warning-kind]")]
        .map(item => item.dataset.warningKind),
      text: document.querySelector("[data-module=warnings]")?.textContent ?? "",
      warningButton: button ? { atMs: Number(button.dataset.warningAtMs), pollId: button.dataset.warningPollId } : null,
      wifiPresent: map.sources.has("report-wifi-fixes") && map.layers.has("report-wifi-fixes-lyr"),
      wifiExact: wifi.length === timeline.length && timeline.every(sample => {
        const feature = wifiByPoll.get(sample.pollId);
        return exact(feature, sample.fix) && feature.properties.z === sample.fix.z;
      }),
      mismatchPairsExact: features.length === reportedFeatures.length && features.length > 0
        && features.every(feature => {
          const point = warningByPair.get(feature.properties.pairId);
          const reported = reportedByPair.get(feature.properties.pairId);
          return exact(feature, point) && feature.properties.z === point?.z
            && exact(reported, { lng: point?.reportedLng, lat: point?.reportedLat })
            && reported?.properties.z === point?.reportedZ;
        }),
      warningFeatures: features.map(feature => ({ coordinates: feature.geometry.coordinates, ...feature.properties })),
    };
  });
  failures.push(...reportAnalysisFindings(warningState));
  failures.push(...await exerciseWarningHandoff(page));
  failures.push(...await exerciseNativeFloor(page, fixture.meta.zLevels));
  return failures;
}

export function reportAnalysisFindings(state) {
  const findings = [];
  for (const kind of ["stale-position", "floor-mismatch"]) {
    if (!state.kinds?.includes(kind)) findings.push(`Report warning missing ${kind}`);
  }
  if (!/Stale \/ sticky position/i.test(state.text)) findings.push("Report stale-position warning copy is missing");
  if (!/Floor level disconnect/i.test(state.text)) findings.push("Report floor-disconnect warning copy is missing");
  if (!Number.isFinite(state.warningButton?.atMs) || !state.warningButton?.pollId) {
    findings.push("Report warning lacks a Player time/poll handoff");
  } else if (!state.text.includes(state.warningButton.pollId)
      || !state.text.includes(new Date(state.warningButton.atMs).toISOString())) {
    findings.push("Report warning hides its representative poll/time evidence");
  }
  if (!state.wifiPresent) findings.push("Report Wi-Fi fix source/layer is missing");
  if (!state.wifiExact) findings.push("Report Wi-Fi fixes changed timeline lng/lat/z");
  if (!state.mismatchPairsExact) findings.push("Report floor mismatch did not pair truth/reported endpoints on their own z");
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

async function exerciseWarningHandoff(page) {
  const expected = await page.$eval("[data-warning-play]", button => ({
    atMs: Number(button.dataset.warningAtMs),
    pollId: button.dataset.warningPollId,
  }));
  await page.click("[data-warning-play]");
  await page.waitForSelector("body.player-active");
  const actual = await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    return { atMs: session.player.atMs, mode: session.player.mode };
  });
  await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    session.player.setMode("analysis");
  });
  await page.waitForFunction(() => !document.body.classList.contains("player-active"));
  return actual.mode === "playback" && actual.atMs === expected.atMs
    ? []
    : ["Report warning did not open its exact Player moment"];
}
async function exerciseNativeFloor(page, floors) {
  const before = await page.evaluate(values => {
    const map = window.__reportMapState.map;
    return {
      target: values.find(value => value !== map.zLevel) ?? values[0],
      writes: map.sources.get("report-sticky-heat")?.updates ?? 0,
    };
  }, floors);
  await page.evaluate(z => { window.__reportMapState.map.zLevel = z; }, before.target);
  await page.waitForFunction((z, layerIds) => {
    const map = window.__reportMapState.map;
    const expected = JSON.stringify(["==", ["get", "z"], z]);
    return Number(document.querySelector("[data-map-floor]").value) === z
      && layerIds.every(id => JSON.stringify(map.layers.get(id)?.filter) === expected);
  }, { timeout: 2000 }, before.target, FLOOR_LAYER_IDS).catch(() => null);
  const state = await page.evaluate(async layerIds => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    await session.surface.settleLayout();
    const map = window.__reportMapState.map;
    return {
      floor: session.surface.floor,
      filters: layerIds.map(id => map.layers.get(id)?.filter),
      mapFloor: map.zLevel,
      selected: Number(document.querySelector("[data-map-floor]").value),
      writes: map.sources.get("report-sticky-heat")?.updates ?? 0,
    };
  }, FLOOR_LAYER_IDS);
  const expectedFilter = JSON.stringify(["==", ["get", "z"], before.target]);
  const valid = [state.floor, state.mapFloor, state.selected]
    .every(value => value === before.target)
    && state.filters.every(filter => JSON.stringify(filter) === expectedFilter);
  return valid && state.writes > before.writes
    ? []
    : [`Native MazeMap floor did not drive stable Report rendering: ${JSON.stringify(state)}`];
}
