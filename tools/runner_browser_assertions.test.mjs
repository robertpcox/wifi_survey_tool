import assert from "node:assert/strict";
import test from "node:test";

import {
  runnerActiveViewFindings,
  runnerDownloadFindings,
} from "./runner_browser_assertions.mjs";

test("Runner browser findings cover capture, storage, and credential leaks", () => {
  const valid = {
    filename: "run.result.v3.json",
    mapAccessUsed: true,
    storageEntries: 0,
    result: {
      run: {
        completionStatus: "completed",
        device: { name: "Phone" },
        band: "5",
      },
      checkIns: [{}, {}],
      events: [{ type: "endpoint-hold-started" }],
      polls: [{ raw: {}, normalized: {} }],
    },
  };
  assert.deepEqual(runnerDownloadFindings(valid, 2), []);
  const invalid = structuredClone(valid);
  invalid.result.run.completionStatus = "aborted";
  invalid.result["secret"] = ["browser", "app", "key"].join("-");
  invalid.storageEntries = 1;
  assert.deepEqual(runnerDownloadFindings(invalid, 3), [
    "not completed",
    "check-ins missing",
    "browser storage was written",
    "credential reached result",
  ]);
});

test("Runner active-view findings enforce map-first capture geometry", () => {
  const valid = {
    actions: { top: 700, bottom: 844, left: 0, right: 390 },
    active: true,
    bodyOverflow: "hidden",
    camera: { bearing: 0, pitch: 0 },
    checkIn: { top: 710, bottom: 830, left: 10, right: 280 },
    distance: "≈ 9 m",
    fitBounds: { bounds: [] },
    floor: "Level 0",
    hud: { top: 0, bottom: 160, left: 0, right: 390 },
    map: { top: 0, bottom: 844, left: 0, right: 390, width: 390, height: 844 },
    marker: { glyph: "1" },
    pollCount: 2,
    pollState: "ok",
    setupHidden: true,
    target: "Room A",
    viewport: { width: 390, height: 844 },
  };
  assert.deepEqual(runnerActiveViewFindings(valid, "Level 0"), []);
  assert.deepEqual(
    runnerActiveViewFindings({ ...valid, active: false, pollState: "error" }),
    ["run is not viewport locked", "poll health is not visible"],
  );
  assert.deepEqual(runnerActiveViewFindings(valid, "Floor 1"), [
    "authored floor name is not visible",
  ]);
  assert.deepEqual(runnerActiveViewFindings(valid, "Level 0", 90), [
    "checkpoint camera bearing does not face the target",
  ]);
});
