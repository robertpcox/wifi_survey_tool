// FEATURE:      Runner browser capture lifecycle acceptance
// SURFACE:      polling, fresh-start, checkpoint completion, download, and reset helpers
// WHY TOGETHER: Position requests and UI evidence must follow Stop, Clear, Preflight, and Go.
// STATE:        Browser page plus interception-owned positioning request count
// RULES:        Stop/Clear/selection stay quiet; Preflight samples once; Go resumes continuous polling.
// PROVENANCE:   Runner post-stop lifecycle clarification

import {
  readRunnerMapTransition, runner3dPerspectiveFindings,
  runnerMapTransitionFindings,
} from "./runner_browser_3d.mjs";

export async function stoppedPollingFindings(page, requestState, waitMs = 140) {
  const beforeRequests = requestState.positionRequests ?? 0;
  const beforePolls = await pollCount(page);
  await delay(waitMs);
  const findings = [];
  if ((requestState.positionRequests ?? 0) !== beforeRequests) {
    findings.push("position requests continued after Stop, Clear, or survey selection");
  }
  if (await pollCount(page) !== beforePolls) {
    findings.push("visible poll count continued after Stop, Clear, or survey selection");
  }
  return findings;
}

export async function preflightAndStartRunner(page, requestState) {
  const findings = [];
  const before = requestState.positionRequests ?? 0;
  await page.click('[data-action="preflight"]');
  if (!await waitForRequestGrowth(requestState, before)) {
    findings.push("fresh Preflight did not request a positioning sample");
  }
  await page.waitForFunction(() => {
    const action = document.querySelector('[data-action="preflight"]');
    const result = document.querySelector("[data-preflight-result]");
    return !action.disabled && !result.hidden
      && document.querySelector("[data-preflight-light]").textContent === "GREEN";
  });
  const afterPreflight = requestState.positionRequests ?? 0;
  if (afterPreflight !== before + 1) {
    findings.push("fresh Preflight did not make exactly one positioning request");
  }
  const visibleAfterGreen = await pollCount(page);
  findings.push(...await stoppedPollingFindings(page, requestState));
  requestState.freshPreflightTrace = {
    requests: [before, afterPreflight, requestState.positionRequests ?? 0],
    visiblePolls: [visibleAfterGreen, await pollCount(page)],
  };
  await page.click('[data-action="go"]');
  await page.waitForFunction(() => document.body.classList.contains("runner-running"));
  if (!await waitForRequestGrowth(requestState, afterPreflight)) {
    findings.push("continuous polling did not resume on Go");
  }
  return findings;
}

export async function completeRunnerCheckpoints(
  page,
  definition,
  threeDState,
) {
  const findings = [];
  for (let index = 0; index < definition.route.checkpoints.length; index++) {
    await page.waitForFunction(() => (
      !document.querySelector('[data-action="check-in"]').disabled
    ));
    await page.click('[data-action="check-in"]');
    if (index !== 0 || definition.route.checkpoints.length < 2) continue;
    await page.waitForFunction(() => window.__runnerMarker?.glyph === "2");
    const next = definition.route.checkpoints[1];
    await page.waitForFunction(z => window.__runnerMap?.zLevel === z, {}, next.z);
    const transition = await readRunnerMapTransition(page);
    findings.push(...runnerMapTransitionFindings(
      transition,
      definition.route.checkpoints[0],
      next,
      next.z,
    ));
    findings.push(...runner3dPerspectiveFindings(transition.pitch, threeDState));
  }
  return findings;
}

export async function finishAndDownloadRunner(page, profileName) {
  await page.waitForSelector('[data-action="end-session"]:not([hidden])');
  const count = await pollCount(page);
  await page.waitForFunction(value => Number(
    document.querySelector("[data-poll-count]").textContent,
  ) > value, {}, count);
  await page.click('[data-action="end-session"]');
  await page.waitForSelector("[data-finish-panel]:not([hidden])");
  await page.type("[data-operator-comment]", `${profileName} browser run`);
  await page.click('[data-action="download-result"]');
  await page.waitForFunction(() => Boolean(window.__runnerDownloadName));
  return page.evaluate(async () => {
    const databases = indexedDB.databases ? await indexedDB.databases() : [];
    return {
      filename: window.__runnerDownloadName,
      mapAccessUsed: window.__runnerMapAccessUsed,
      result: JSON.parse(await window.__runnerBlob.text()),
      storageEntries: localStorage.length + sessionStorage.length + databases.length,
    };
  });
}

export async function downloadResetFindings(page, profileName) {
  const reset = await page.evaluate(() => ({
    device: document.querySelector('[name="deviceName"]').value,
    finishHidden: document.querySelector("[data-finish-panel]").hidden,
    pollCount: Number(document.querySelector("[data-poll-count]").textContent),
    preflightHidden: document.querySelector("[data-preflight-result]").hidden,
  }));
  return !reset.finishHidden || !reset.preflightHidden || reset.pollCount
    || reset.device !== `${profileName} field device`
    ? ["download did not clear final evidence while retaining settings"]
    : [];
}

async function pollCount(page) {
  return page.$eval("[data-poll-count]", node => Number(node.textContent));
}

async function waitForRequestGrowth(requestState, previous, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if ((requestState.positionRequests ?? 0) > previous) return true;
    await delay(20);
  }
  return false;
}

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}
