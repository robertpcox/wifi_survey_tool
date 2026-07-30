// FEATURE:      Report diagnostic chart primitives
// SURFACE:      node --test src/features/report-player/report-chart-svg.test.mjs
// WHY TOGETHER: Projection, peak preservation, and outage bands define synchronized chart fidelity.
// STATE:        Small deterministic series
// RULES:        Bucket reduction must retain a short spike and the exact run axis.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  bucketExtremes,
  chartX,
  renderOutageBands,
  renderTimeAxis,
} from "./report-chart-svg.mjs";

test("chart helpers retain peaks and project outages on the shared clock", () => {
  const points = Array.from({ length: 30 }, (_, index) => ({
    elapsedSeconds: index,
    value: index === 14 ? 99 : index,
  }));
  const reduced = bucketExtremes(points, "value", 3);
  assert.ok(reduced.some(point => point.value === 99));
  assert.equal(chartX(0, 100), 54);
  assert.equal(chartX(100, 100), 982);
  const bands = renderOutageBands({
    durationSeconds: 100,
    requestOutages: [{ elapsedSeconds: 20, durationSeconds: 10 }],
  });
  assert.match(bands, /class="chart-outage"/);
  assert.match(renderTimeAxis(87 * 60 + 18), />87:18</);
});
