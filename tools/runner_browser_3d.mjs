// FEATURE:      Runner browser 3D acceptance
// SURFACE:      exerciseRunner3dToggle(), runner3dFindings(), runner3dRelaunchFindings()
// WHY TOGETHER: Accessible toggle state, SDK calls, launch config, and mobile geometry are one gate.
// STATE:        Browser-observed toggle snapshots and stub call history
// RULES:        UI state must match confirmed off/on calls and every replacement map must enable 3D.
// PROVENANCE:   Runner field 3D display acceptance

import { bearingTo } from "../src/adapters/map/camera-bearing.mjs";

export const RUNNER_BROWSER_3D_PITCH = 45;

export async function exerciseRunner3dToggle(page) {
  await page.waitForSelector('[data-action="toggle-3d"]');
  const initial = await readRunner3dState(page);
  await page.click('[data-action="toggle-3d"]');
  const off = await readRunner3dState(page);
  await page.click('[data-action="toggle-3d"]');
  const on = await readRunner3dState(page);
  return { initial, off, on };
}

export async function readRunner3dState(page) {
  return page.evaluate(() => {
    const button = document.querySelector('[data-action="toggle-3d"]');
    const bounds = button?.getBoundingClientRect();
    const actions = document.querySelector(".capture-actions")?.getBoundingClientRect();
    return {
      actionTop: actions?.top ?? null,
      cameraPitch: window.__runnerCamera?.pitch ?? null,
      config: window.__runner3dLaunchConfigs?.at(-1) ?? null,
      disabled: Boolean(button?.disabled),
      history: [...(window.__runner3dHistory || [])],
      label: button?.getAttribute("aria-label") ?? "",
      launchCount: window.__runner3dLaunchConfigs?.length ?? 0,
      pressed: button?.getAttribute("aria-pressed") ?? null,
      rect: bounds ? {
        bottom: bounds.bottom,
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
      } : null,
      viewport: { height: innerHeight, width: innerWidth },
    };
  });
}

export function runner3dFindings(states) {
  const findings = [];
  const { initial, off, on } = states;
  if (initial.pressed !== "true" || initial.disabled) {
    findings.push("3D control is not initially enabled");
  }
  if (!initial.config?.animateWalls || !initial.config?.show3dAssets) {
    findings.push("initial map launch omitted 3D configuration");
  }
  findings.push(...runner3dPerspectiveFindings(initial.cameraPitch, initial));
  if (JSON.stringify(initial.history) !== JSON.stringify([true])) {
    findings.push("initial 3D mode was not applied to the loaded map");
  }
  if (off.pressed !== "false" || off.label !== "Turn 3D map on") {
    findings.push("3D control did not render the off state");
  }
  if (JSON.stringify(off.history) !== JSON.stringify([true, false])) {
    findings.push("3D disable call was not recorded exactly once");
  }
  findings.push(...runner3dPerspectiveFindings(off.cameraPitch, off));
  if (on.pressed !== "true" || on.label !== "Turn 3D map off") {
    findings.push("3D control did not render the restored on state");
  }
  if (JSON.stringify(on.history) !== JSON.stringify([true, false, true])) {
    findings.push("3D enable call did not follow disable");
  }
  findings.push(...runner3dPerspectiveFindings(on.cameraPitch, on));
  if (!insideViewport(initial) || (initial.actionTop != null
      && initial.rect.bottom > initial.actionTop + 1)) {
    findings.push("3D control is outside or overlaps mobile capture controls");
  }
  return findings;
}

export function runner3dRelaunchFindings(state, expectedLaunches = 2) {
  const findings = [];
  if (state.launchCount !== expectedLaunches) {
    findings.push("fresh preflight did not replace the map exactly once");
  }
  if (!state.config?.animateWalls || !state.config?.show3dAssets) {
    findings.push("replacement map omitted 3D configuration");
  }
  if (state.pressed !== "true") findings.push("3D UI state did not survive fresh preflight");
  findings.push(...runner3dPerspectiveFindings(state.cameraPitch, state));
  if (JSON.stringify(state.history) !== JSON.stringify([true, false, true, true])) {
    findings.push("map replacement emitted unexpected 3D toggle calls");
  }
  return findings;
}

export function runnerPitchFor3d(state) {
  return state?.pressed === "true" ? RUNNER_BROWSER_3D_PITCH : 0;
}

export function runner3dPerspectiveFindings(pitch, state) {
  return pitch === runnerPitchFor3d(state)
    ? []
    : ["checkpoint camera lost its selected 3D perspective"];
}

export async function readRunnerMapTransition(page) {
  return page.evaluate(() => ({
    activeLeg: window.__runnerFilters?.["route-active-lyr"]?.at(-1),
    bearing: window.__runnerCamera?.bearing,
    pitch: window.__runnerCamera?.pitch,
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

function insideViewport(state) {
  const rect = state.rect;
  return Boolean(rect)
    && rect.top >= -1
    && rect.left >= -1
    && rect.bottom <= state.viewport.height + 1
    && rect.right <= state.viewport.width + 1;
}

function bearingDifference(left, right) {
  return Math.abs((left - right + 540) % 360 - 180);
}
