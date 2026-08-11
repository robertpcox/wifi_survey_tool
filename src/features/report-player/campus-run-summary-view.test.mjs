// FEATURE:      Consolidated run summary
// SURFACE:      node --test src/features/report-player/campus-run-summary-view.test.mjs
// WHY TOGETHER: KPI, lag graph, and run-table markup prove one moving-evidence view.
// STATE:        Synthetic overview
// RULES:        Moving lane copy never claims room-resolution evidence.
// PROVENANCE:   Campus-level consolidated report

import assert from "node:assert/strict";
import test from "node:test";

import { renderCampusRunSummary } from "./campus-run-summary-view.mjs";

test("run summary renders aggregate KPIs and lag evidence", () => {
  const html = renderCampusRunSummary({
    runCount: 1,
    metrics: {
      totalStickySeconds: 42,
      medianRunLagBehindM: 3.2,
      medianRunNoPositionPercent: 4.5,
    },
    runs: [{
      resultId: "run-12345678",
      surveyName: "Dynamic <rooms>", startedAt: "2026-08-01T00:00:00Z",
      deviceName: "Phone", stickySeconds: 42, medianLagBehindM: 3.2,
      noPositionPercent: 4.5,
    }],
  });
  assert.match(html, /No-update time/);
  assert.match(html, /Cisco lag behind route by run/);
  assert.match(html, /Dynamic &lt;rooms&gt; · run-1234/);
  assert.match(html, /3\.2 m/);
  assert.doesNotMatch(html, /<th>Device<\/th>|Phone/);
});
