// FEATURE:      Report Player browser acceptance
// SURFACE:      exerciseMapLaunchFailures(options)
// WHY TOGETHER: Access retry and prompt-free failure scenarios prove the public-first decision boundary.
// STATE:        Fresh Chrome page and fake SDK state per recorded launch scenario
// RULES:        Only structured denial reveals access; other failures stay on labelled fallback.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import { installReportPlayerMazeMapStub } from "./report_player_browser_stub.mjs";

export async function exerciseMapLaunchFailures({
  browser,
  origin,
  reportUrl,
}) {
  const failures = [];
  failures.push(...await accessRetry(browser, origin, reportUrl));
  for (const scenario of ["network-failure", "unknown-failure"]) {
    failures.push(...await promptFree(browser, origin, reportUrl, scenario));
  }
  return failures;
}

async function accessRetry(browser, origin, reportUrl) {
  const { page, failures } = await scenarioPage(browser, origin, "access-denied");
  await page.goto(reportUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector("[data-map-access-panel]").hidden);
  const denied = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return {
      fallback: !document.querySelector("[data-map-fallback]").hidden,
      mapHidden: document.querySelector("[data-maze-map]").hidden,
      storage: localStorage.length + sessionStorage.length + databases.length,
    };
  });
  if (!denied.fallback || !denied.mapHidden) failures.push("access denial lacked fallback");
  if (denied.storage) failures.push("access denial wrote browser storage");
  await page.$eval("[data-map-access]", input => { input.value = "x".repeat(12); });
  await page.click("[data-save-access]");
  await page.waitForFunction(() => (
    document.querySelector("[data-map-runtime-status]")?.textContent.includes("access active")
    && document.querySelector("[data-map-access-panel]").hidden
  ));
  const unlocked = await page.evaluate(async () => {
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const databases = await indexedDB.databases();
    const beforeModeSwitch = window.__reportMapState.instances;
    session.player.setMode("playback");
    session.player.setMode("analysis");
    return {
      accessPanelHidden: document.querySelector("[data-map-access-panel]").hidden,
      beforeModeSwitch,
      fallbackHidden: document.querySelector("[data-map-fallback]").hidden,
      instances: window.__reportMapState.instances,
      mapVisible: !document.querySelector("[data-maze-map]").hidden,
      storage: localStorage.length + sessionStorage.length + databases.length,
      submittedCount: window.__reportMapState.tokens.length,
    };
  });
  if (!unlocked.accessPanelHidden || !unlocked.fallbackHidden || !unlocked.mapVisible) {
    failures.push(`access retry did not restore MazeMap ${JSON.stringify(unlocked)}`);
  }
  if (unlocked.submittedCount !== 1) failures.push("access retry was not submitted once");
  if (unlocked.instances !== unlocked.beforeModeSwitch) {
    failures.push("mode switch constructed another map after access retry");
  }
  if (unlocked.storage) failures.push("submitted access reached browser storage");
  await page.close();
  return failures.map(value => `access-denied: ${value}`);
}

async function promptFree(browser, origin, reportUrl, scenario) {
  const { page, failures } = await scenarioPage(browser, origin, scenario);
  await page.goto(reportUrl, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => (
    document.querySelector("[data-map-runtime-status]")?.textContent.includes("fallback active")
  ));
  const state = await page.evaluate(async () => {
    const databases = await indexedDB.databases();
    return {
      accessPanelHidden: document.querySelector("[data-map-access-panel]").hidden,
      fallbackVisible: !document.querySelector("[data-map-fallback]").hidden,
      storage: localStorage.length + sessionStorage.length + databases.length,
      submittedCount: window.__reportMapState.tokens.length,
    };
  });
  if (!state.accessPanelHidden) failures.push("generic failure prompted for access");
  if (!state.fallbackVisible) failures.push("generic failure lacked labelled fallback");
  if (state.submittedCount) failures.push("generic failure configured access");
  if (state.storage) failures.push("generic failure wrote browser storage");
  await page.close();
  return failures.map(value => `${scenario}: ${value}`);
}

async function scenarioPage(browser, origin, scenario) {
  const page = await browser.newPage();
  const failures = [];
  page.on("pageerror", error => failures.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") failures.push(message.text());
  });
  await installReportPlayerMazeMapStub(page, origin, scenario);
  return { page, failures };
}
