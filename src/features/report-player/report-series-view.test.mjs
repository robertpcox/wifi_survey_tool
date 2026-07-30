// FEATURE:      Report diagnostic series
// SURFACE:      node --test src/features/report-player/report-series-view.test.mjs
// WHY TOGETHER: Four synchronized panels and request-outage prose form one analytical view.
// STATE:        Small deterministic insight projection
// RULES:        Show failures without inventing a failed position fix.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { renderReportSeries } from "./report-series-view.mjs";

test("diagnostic view renders four panels and the retained request outage", () => {
  const timeline = [
    point(0, 2, 1, 900, 1, 1),
    point(10, 14, 20, 12099, 2, 1, true),
    point(20, 4, 3, 950, 2, 2),
  ];
  timeline[1].requestFailed = true;
  const html = renderReportSeries({
    timeline,
    durationSeconds: 20,
    byFloor: [{ z: 1, name: "Level 0" }, { z: 2, name: "Level 1" }],
    requestFailures: [timeline[1]],
    requestOutages: [{
      elapsedSeconds: 5,
      durationSeconds: 12.1,
      requestCount: 1,
      worstRoundTripMs: 12099,
      error: "Timed out",
    }],
  }, { stickySeconds: 15, accuracyM: 10 });
  assert.equal((html.match(/class="diagnostic-panel/g) ?? []).length, 4);
  assert.match(html, /Position error/);
  assert.match(html, /Time since last position update/);
  assert.match(html, /12\.1 s/);
  assert.match(html, /Timed out/);
});

function point(elapsedSeconds, accuracyM, fixAgeSeconds, roundTripMs, reportedZ, actualZ, critical = false) {
  return {
    elapsedSeconds,
    accuracyM,
    fixAgeSeconds,
    roundTripMs,
    reportedZ,
    actualZ,
    stale: critical,
    outsideAccuracy: critical,
    wrongFloor: reportedZ !== actualZ,
    requestFailed: false,
  };
}
