import { bearingTo } from "../src/adapters/map/camera-bearing.mjs";

export async function setRunnerEntry(page, name) {
  const values = {
    mapAccess: "browser-map-value",
    appId: "browser-app-id",
    appKey: ["browser", "app", "key"].join("-"),
    clientIp: "192.0.2.8",
    deviceOs: `${name} OS 1`,
    deviceName: `${name} field device`,
  };
  for (const [field, value] of Object.entries(values)) {
    await page.type(`[name="${field}"]`, value);
  }
  await page.select('[name="deviceType"]', "mobile");
  await page.select('[name="band"]', "5");
  await page.click('[name="consent"]');
}

export async function openRunnerShareLink(page, url) {
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document
    .querySelector("[data-runner-status]").textContent.includes("Survey loaded"));
}

export async function startRunnerCapture(page, profileName) {
  await setRunnerEntry(page, profileName);
  await page.click('[data-action="preflight"]');
  await page.waitForFunction(() => document
    .querySelector("[data-preflight-light]").textContent === "GREEN");
  await page.click('[data-action="go"]');
  await page.waitForFunction(() => document.body.classList.contains("runner-running"));
}

export async function readRunnerActiveView(page) {
  return page.evaluate(() => {
    const rect = selector => {
      const value = document.querySelector(selector)?.getBoundingClientRect();
      return value && {
        bottom: value.bottom,
        height: value.height,
        left: value.left,
        right: value.right,
        top: value.top,
        width: value.width,
      };
    };
    return {
      actions: rect(".capture-actions"),
      active: document.body.classList.contains("runner-running"),
      bodyOverflow: getComputedStyle(document.body).overflow,
      camera: window.__runnerCamera,
      checkIn: rect('[data-action="check-in"]'),
      distance: document.querySelector("[data-target-distance]")?.textContent,
      fitBounds: window.__runnerFitBounds,
      floor: document.querySelector("[data-current-floor]")?.textContent,
      hud: rect(".run-hud"),
      map: rect("#runner-map"),
      marker: window.__runnerMarker,
      pollCount: Number(document.querySelector("[data-poll-count]")?.textContent),
      pollState: document.querySelector("[data-poll-indicator]")?.dataset.state,
      setupHidden: document.querySelector("[data-setup-controls]")?.hidden,
      target: document.querySelector("[data-current-target]")?.textContent,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

export async function readRunnerMapTransition(page) {
  return page.evaluate(() => ({
    activeLeg: window.__runnerFilters?.["route-active-lyr"]?.at(-1),
    bearing: window.__runnerCamera?.bearing,
    waypointOpacity: window.__runnerPaint?.["wp-pts-lyr.circle-opacity"],
  }));
}

export function runnerMapTransitionFindings(state, origin, target, expectedZ) {
  const findings = [];
  if (state.activeLeg !== 0) findings.push("current route leg is not active");
  if (bearingDifference(state.bearing, bearingTo(origin, target)) > 0.1) {
    findings.push("next checkpoint is not direction-up");
  }
  if (!JSON.stringify(state.waypointOpacity).includes(String(expectedZ))) {
    findings.push("checkpoint styling did not follow the active floor");
  }
  return findings;
}

export function runnerActiveViewFindings(view, expectedFloor, expectedBearing) {
  const findings = [];
  const inside = rect => rect
    && rect.top >= -1
    && rect.left >= -1
    && rect.bottom <= view.viewport.height + 1
    && rect.right <= view.viewport.width + 1;
  if (!view.active || view.bodyOverflow !== "hidden") findings.push("run is not viewport locked");
  if (!view.setupHidden) findings.push("setup controls remain visible");
  if (!inside(view.map)
    || view.map.width < view.viewport.width - 2
    || view.map.height < view.viewport.height - 2) {
    findings.push("map does not fill the viewport");
  }
  if (!inside(view.hud) || !inside(view.actions) || !inside(view.checkIn)) {
    findings.push("run controls leave the viewport");
  }
  if (!view.fitBounds) findings.push("survey bounds were not fitted");
  if (!Number.isFinite(view.camera?.bearing) || view.camera?.pitch !== 0) {
    findings.push("checkpoint camera is not direction-up");
  } else if (Number.isFinite(expectedBearing)
    && bearingDifference(view.camera.bearing, expectedBearing) > 0.1) {
    findings.push("checkpoint camera bearing does not face the target");
  }
  if (view.marker?.glyph !== "1") findings.push("first checkpoint is not highlighted");
  if (view.pollState !== "ok" || view.pollCount < 1) findings.push("poll health is not visible");
  if (!/^≈ \d+ m$|^Change to floor /.test(view.distance || "")) {
    findings.push("checkpoint distance is not visible");
  }
  if (!view.target?.trim()) findings.push("checkpoint target is not visible");
  if (expectedFloor && view.floor !== expectedFloor) findings.push("authored floor name is not visible");
  return findings;
}

function bearingDifference(left, right) {
  return Math.abs((left - right + 540) % 360 - 180);
}

export function runnerDownloadFindings(download, checkpointCount) {
  const text = JSON.stringify(download.result);
  const findings = [];
  if (download.result.run.completionStatus !== "completed") {
    findings.push("not completed");
  }
  if (download.result.checkIns.length !== checkpointCount) findings.push("check-ins missing");
  if (!download.result.events?.some(event => event.type === "endpoint-hold-started")) findings.push("endpoint hold event missing");
  if (!download.result.polls[0]?.raw) findings.push("raw poll missing");
  if (!download.result.polls[0]?.normalized) findings.push("normalized poll missing");
  if (!download.result.run.device?.name || download.result.run.band !== "5") {
    findings.push("device or band missing");
  }
  if (!download.mapAccessUsed) findings.push("private map access unused");
  if (download.storageEntries) findings.push("browser storage was written");
  for (const secret of ["browser-map-value", "browser-app-id", "browser-app-key"]) {
    if (text.includes(secret)) findings.push("credential reached result");
  }
  if (!download.filename.endsWith(".result.v3.json")) {
    findings.push("filename invalid");
  }
  return findings;
}
