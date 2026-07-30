// FEATURE:      Report analysis browser acceptance
// SURFACE:      node --test tools/report_player_browser_analysis.test.mjs
// WHY TOGETHER: Pure warning-state findings prove the browser assertion fails loudly.
// STATE:        Minimal browser inspection snapshots
// RULES:        Exact coordinates and distinct floor identities are mandatory.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { reportAnalysisFindings } from "./report_player_browser_analysis.mjs";

test("valid warning browser state has no findings", () => {
  assert.deepEqual(reportAnalysisFindings({
    kinds: ["stale-position", "floor-mismatch"],
    text: "Stale / sticky position Floor level disconnect 1970-01-01T00:00:00.010Z poll-1",
    warningButton: { atMs: 10, pollId: "poll-1" },
    mismatchPairsExact: true,
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
