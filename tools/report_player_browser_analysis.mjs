// FEATURE:      Report analysis browser acceptance
// SURFACE:      exerciseReportAnalysis(page, fixture)
// WHY TOGETHER: Access, warnings, native floor switching, and Player handoff form one Report path.
// STATE:        One fake-SDK Report page and its shared map
// RULES:        Native MazeMap z-level is authoritative and captured warning geometry stays exact.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import {
  activateAnalysisWarnings,
  readReportAnalysisState,
  reportAnalysisFindings,
} from "./report_player_browser_analysis_state.mjs";

const FLOOR_LAYER_IDS = [
  "report-sticky-heat-lyr",
  "report-accuracy-heat-lyr",
  "report-stale-path-lyr",
  "report-floor-mismatch-lyr",
  "report-floor-mismatch-reported-lyr",
  "report-wifi-fixes-lyr",
];
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
  await activateAnalysisWarnings(page);
  const warningState = await readReportAnalysisState(page);
  failures.push(...reportAnalysisFindings(warningState));
  failures.push(...await exerciseWarningHandoff(page));
  failures.push(...await exerciseNativeFloor(page, fixture.meta.zLevels));
  return failures;
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
    return {
      atMs: session.player.atMs,
      alert: document.querySelector("[data-module=mapAlerts]")?.textContent ?? "",
      mode: session.player.mode,
      stalePathVisible: window.__reportMapState.map.layers
        .get("report-stale-path-lyr")?.layout?.visibility !== "none",
    };
  });
  await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    session.player.setMode("analysis");
  });
  await page.waitForFunction(() => !document.body.classList.contains("player-active"));
  return actual.mode === "playback"
      && actual.atMs === expected.atMs
      && /No position update/i.test(actual.alert)
      && actual.stalePathVisible
    ? []
    : ["Report warning did not open its exact Player moment with visible map warning/path"];
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
