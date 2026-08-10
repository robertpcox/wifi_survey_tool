// FEATURE:      Consolidated run scalars
// SURFACE:      node --test src/domain/report-campus-runs.test.mjs
// WHY TOGETHER: Run rows and campus KPI must use the same positive trailing-lag population.
// STATE:        One synthetic run with ahead and behind samples
// RULES:        Positions ahead of the walker never dilute a trailing-lag report.
// PROVENANCE:   Campus-level consolidated report

import assert from "node:assert/strict";
import test from "node:test";

import { campusRunMetrics, campusRunSummaries }
  from "./report-campus-runs.mjs";

test("campus lag scalars keep positive trailing samples only", () => {
  const analysis = {
    metrics: { stickySeconds: 12 },
    fixes: {
      lagSeries: [
        { moving: true, lagBehindM: -8 },
        { moving: true, lagBehindM: 2 },
        { moving: true, lagBehindM: 6 },
        { moving: false, lagBehindM: 20 },
      ],
      availability: { noPositionPercent: 3 },
    },
  };
  const runs = [{
    result: { run: {
      resultId: "run-a", startedAt: "2026-01-01T00:00:00Z",
      device: { name: "Phone" },
    }, meta: { surveyName: "Survey" } },
    analysis,
  }];
  assert.equal(campusRunSummaries(runs)[0].medianLagBehindM, 4);
  assert.equal(campusRunMetrics(runs).medianRunLagBehindM, 4);
});
