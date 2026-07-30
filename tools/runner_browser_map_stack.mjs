// FEATURE:      Runner map stacking and floor-control acceptance
// SURFACE:      readRunnerMapStack(), runnerMapStackFindings()
// WHY TOGETHER: Constructor suppression, control placement, and overlay anchors are one map launch.
// STATE:        Browser-observed SDK stub history
// RULES:        Route lines sit below walls; guidance stays above; every launch gets one floor bar.
// PROVENANCE:   Runner field feedback for 3D stacking and hidden floor control

export async function readRunnerMapStack(page) {
  return page.evaluate(() => ({
    floorControls: structuredClone(window.__runnerFloorControls || []),
    layerPlacements: structuredClone(window.__runnerLayerPlacements || {}),
    zLevelControl: window.__runnerMap?.options?.zLevelControl,
  }));
}

export function runnerMapStackFindings(state, expectedLaunches = 1) {
  const findings = [];
  if (state.zLevelControl !== false) {
    findings.push("Runner did not suppress the built-in floor control");
  }
  if (state.floorControls.length !== expectedLaunches) {
    findings.push("Runner did not attach exactly one floor bar per map launch");
  }
  for (const control of state.floorControls) {
    if (control.placement !== "middle-right"
        || control.options?.autoUpdate !== true
        || control.options?.maxHeight !== 400) {
      findings.push("Runner floor bar does not match the middle-right contract");
      break;
    }
  }
  for (const id of ["route-lines-lyr", "route-active-lyr"]) {
    if (state.layerPlacements[id] !== "mm-walls-extrusion") {
      findings.push(`${id} is not below the wall extrusion`);
    }
  }
  for (const id of ["wp-pts-lyr", "stop-pts-lyr"]) {
    if (state.layerPlacements[id] !== null) {
      findings.push(`${id} did not remain above the building extrusions`);
    }
  }
  return findings;
}
