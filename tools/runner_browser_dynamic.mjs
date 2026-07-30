// FEATURE:      Dynamic room Runner browser acceptance
// SURFACE:      exerciseDynamicRoomBrowser(), dynamicRoomBrowserFindings()
// WHY TOGETHER: Dropdown, map taps, polling-safe routing, and paired files form one mobile path.
// STATE:        One isolated Android-sized page and controlled MazeMap route
// RULES:        Route overlay stays empty and Finish polls until route release.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { DYNAMIC_SURVEY_ID }
  from "../src/features/survey-runner/runner-mode.mjs";
import {
  openRunnerShareLink,
  setRunnerEntry,
} from "./runner_browser_assertions.mjs";
import { installRunnerBrowserEnvironment }
  from "./runner_browser_environment.mjs";
import { exerciseDefinitionUploadRerun, exerciseDynamicMarkWalk, resolveRunnerRoute }
  from "./runner_browser_dynamic_marks.mjs";
import { stoppedPollingFindings } from "./runner_browser_lifecycle.mjs";

export async function exerciseDynamicRoomBrowser(options) {
  const { browser, definition, origin, path } = options;
  const page = await browser.newPage();
  const failures = [];
  await page.setViewport({
    width: 412, height: 915, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true,
  });
  const requests = await installRunnerBrowserEnvironment(
    page,
    origin,
    definition,
  );
  page.on("pageerror", error => failures.push(error.stack || error.message));
  await openRunnerShareLink(
    page,
    `${origin}${path}?survey_id=${encodeURIComponent(definition.meta.surveyId)}`,
  );
  await page.select("[data-survey-select]", DYNAMIC_SURVEY_ID);
  await setRunnerEntry(page, "Dynamic Android");
  await page.select('[name="dynamicDwellSeconds"]', "5");
  await page.click('[data-action="preflight"]');
  await page.waitForFunction(() => (
    document.querySelector("[data-preflight-light]").textContent === "GREEN"
  ));
  await page.click('[data-action="go"]');
  await page.waitForSelector("[data-dynamic-room-panel]:not([hidden])");
  await exerciseDynamicMarkWalk(page, definition);
  try {
    await page.waitForFunction(
      () => typeof window.__resolveRunnerRoute === "function",
      { timeout: 5000 },
    );
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({
      phase: document.querySelector("[data-dynamic-room-panel]")?.dataset.phase,
      status: document.querySelector("[data-dynamic-room-status]")?.textContent,
      checkInHidden: document.querySelector('[data-action="dynamic-check-in"]')?.hidden,
      finishDisabled: document.querySelector('[data-action="dynamic-finish"]')?.disabled,
    }));
    throw new Error(`Dynamic route did not start: ${JSON.stringify({
      ...diagnostic,
      pageErrors: failures,
      timeout: error.message,
    })}`);
  }
  const count = await page.$eval(
    "[data-poll-count]",
    node => Number(node.textContent),
  );
  await page.click('[data-action="dynamic-finish"]');
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="finalising"]');
  await page.waitForFunction(before => Number(
    document.querySelector("[data-poll-count]").textContent,
  ) > before, {}, count);
  await resolveRunnerRoute(page, "committed route leg");
  await page.waitForSelector('[data-dynamic-room-panel][data-phase="completed"]');
  failures.push(...await stoppedPollingFindings(page, requests));
  const definitionFile = await download(page, "dynamic-download-definition");
  const resultFile = await download(page, "dynamic-download-result");
  const state = await page.evaluate(() => ({
    routeFeatures: window.__runnerMap.sources.get("route-lines").data.features.length,
    setupName: document.querySelector('[name="deviceName"]').value,
    storageEntries: localStorage.length + sessionStorage.length,
  }));
  failures.push(...dynamicRoomBrowserFindings({
    definition: definitionFile.value,
    definitionName: definitionFile.filename,
    result: resultFile.value,
    resultName: resultFile.filename,
    ...state,
  }));
  await page.click('[data-action="dynamic-clear"]');
  await page.waitForFunction(() => !document.body.classList.contains("runner-running"));
  await exerciseDefinitionUploadRerun(page, definitionFile.value);
  await page.close();
  if (failures.length) throw new Error(`Dynamic Android: ${failures.join("\n")}`);
  return { definition: definitionFile.filename, result: resultFile.filename };
}

export function dynamicRoomBrowserFindings(value) {
  const findings = [];
  if (value.routeFeatures !== 0) findings.push("background route became visible");
  if (value.definition?.meta?.surveyName !== "Dynamic room survey") {
    findings.push("dynamic definition name missing");
  }
  if (value.definition?.route?.stops?.length !== 2
      || value.result?.checkIns?.length !== 4) {
    findings.push("two stops with two passed marks were not exported");
  }
  const checkpoints = value.definition?.route?.checkpoints ?? [];
  if (checkpoints.map(checkpoint => checkpoint.type).join()
      !== "stop,intermediate,intermediate,stop"
      || checkpoints.some(checkpoint => checkpoint.spacingBasisM !== 5)
      || value.definition?.meta?.route?.checkpointSpacingM !== 5) {
    findings.push("5 m marks did not export with planned conventions");
  }
  if (value.result?.run?.captureMode !== "dynamic-room") {
    findings.push("dynamic capture provenance missing");
  }
  if (value.result?.run?.routeHash !== value.definition?.route?.hash
      || JSON.stringify(value.result?.route) !== JSON.stringify(value.definition?.route)) {
    findings.push("paired export route identity drifted");
  }
  if (!value.definitionName?.endsWith(".definition.v3.json")
      || !value.resultName?.endsWith(".result.v3.json")) {
    findings.push("dynamic filenames are invalid");
  }
  if (value.setupName !== "Dynamic Android field device" || value.storageEntries) {
    findings.push("setup was lost or browser storage was written");
  }
  const exported = JSON.stringify([value.definition, value.result]);
  for (const secret of ["browser-map-value", "browser-app-id", "browser-app-key"]) {
    if (exported.includes(secret)) findings.push("credential reached dynamic export");
  }
  return findings;
}

async function download(page, action) {
  await page.evaluate(() => {
    delete window.__runnerDownloadName;
    delete window.__runnerBlob;
  });
  await page.click(`[data-action="${action}"]`);
  await page.waitForFunction(() => Boolean(window.__runnerDownloadName));
  return page.evaluate(async () => ({
    filename: window.__runnerDownloadName,
    value: JSON.parse(await window.__runnerBlob.text()),
  }));
}
