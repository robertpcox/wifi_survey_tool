// FEATURE:      Campus overview merge
// SURFACE:      Node test for report-campus-overview.mjs
// WHY TOGETHER: Two overlapping fixture runs prove geographic pooling and direction merging.
// STATE:        Two analyzed fixtures sharing one corridor
// RULES:        Bins pool by geography per floor; both-direction evidence may span runs.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildCampusOverview } from "./report-campus-overview.mjs";

const load = async name => JSON.parse(await readFile(
  new URL(`../../data/fixtures/report-player/${name}`, import.meta.url),
));
const thresholds = { stickySeconds: 2, accuracyM: 5 };
const straight = await load("result.fixture.v3.json");
const outAndBack = await load("result.out-and-back.fixture.v3.json");
const overview = buildCampusOverview([
  { result: straight, analysis: analyzeReportResult(straight, thresholds) },
  { result: outAndBack, analysis: analyzeReportResult(outAndBack, thresholds) },
]);

test("runs sharing a corridor pool into the same geographic bins", () => {
  assert.equal(overview.runCount, 2);
  assert.equal(overview.binSizeM, 5);
  assert.deepEqual(overview.floors, [{ z: 0, name: "Ground" }, { z: 1, name: "First" }]);
  const shared = overview.bins.find(bin => bin.runCount === 2);
  assert.ok(shared, "expected a bin visited by both runs");
  assert.equal(shared.z, 0);
  assert.deepEqual(shared.runIds, ["result-out-back-1", "result-report-1"]);
  assert.ok(shared.lockSeconds > 0);
  assert.ok(Number.isFinite(shared.medianErrorM));
});

test("direction evidence merges across runs into both-direction spots", () => {
  const both = overview.bins.filter(bin => bin.bothDirections);
  assert.ok(both.length >= 1);
  assert.ok(both.some(bin => bin.centreRunCount > 0
    || (bin.forwardRunCount > 0 && bin.reverseRunCount > 0)));
  assert.equal(
    overview.bins[0].lockSeconds,
    Math.max(...overview.bins.map(bin => bin.lockSeconds)),
  );
});

test("an empty run list yields an empty overview", () => {
  assert.deepEqual(buildCampusOverview([]), {
    binSizeM: 5,
    runCount: 0,
    floors: [],
    bins: [],
  });
});
