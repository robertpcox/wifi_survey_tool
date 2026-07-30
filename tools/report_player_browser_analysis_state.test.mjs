// FEATURE:      Report analysis browser acceptance state
// SURFACE:      Node tests for reportAnalysisFindings(state)
// WHY TOGETHER: Valid and missing snapshots prove every browser finding fails loudly.
// STATE:        Minimal browser inspection snapshots
// RULES:        Exact geometry, empty Report banners, diagnostics, controls, and handoff are mandatory.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { reportAnalysisFindings } from "./report_player_browser_analysis_state.mjs";

test("valid warning browser state has no findings", () => {
  assert.deepEqual(reportAnalysisFindings({
    kinds: ["stale-position", "floor-mismatch"],
    text: "No position update Floor level disconnect 1970-01-01T00:00:00.010Z poll-1",
    mapAlertText: "",
    mapAlertsInsideMap: true,
    diagnosticPanels: 5,
    directionPanels: 1,
    insightText: "Top no-update locations Floor changes lag behind",
    noPrimaryTimeline: true,
    thresholdOptions: {
      accuracy: [5, 10, 15, 20, 25],
      timeliness: [2, 10, 15, 20, 30],
    },
    warningButton: { atMs: 10, pollId: "poll-1" },
    mismatchPairsExact: true,
    stalePathExact: true,
    stalePathPresent: true,
    wifiExact: true,
    wifiPresent: true,
    warningFeatures: [{
      coordinates: [170.5, -45.8],
      lng: 170.5,
      lat: -45.8,
      z: 1,
      reportedZ: 2,
    }],
  }), []);
});

test("missing warning evidence is named", () => {
  const findings = reportAnalysisFindings({
    kinds: [],
    mismatchPairsExact: false,
    text: "",
    warningButton: null,
    wifiExact: false,
    wifiPresent: false,
    warningFeatures: [],
  });
  assert.ok(findings.length >= 9);
  assert.match(findings.join("\n"), /stale-position/);
  assert.match(findings.join("\n"), /Wi-Fi fixes changed/);
  assert.match(findings.join("\n"), /pair truth\/reported endpoints/);
  assert.match(findings.join("\n"), /map layer is empty/);
});
