// FEATURE:      Report Player all-runs comparison
// SURFACE:      node --test src/features/report-player/all-runs.test.mjs
// WHY TOGETHER: Lazy loading, row scalars, and section states prove one route-free comparison.
// STATE:        Loaded fixture and an injected manifest source
// RULES:        Nothing fetches before load(); rows sort newest first with the current run marked.
// PROVENANCE:   NDH one-off dynamic runs must still compare against the campus

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import {
  allRunsRow,
  createAllRunsLoader,
  renderAllRunsSection,
} from "./all-runs.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const thresholds = { stickySeconds: 2, accuracyM: 5 };

test("loader fetches lazily and rows sort newest-first with the current run", async () => {
  const older = structuredClone(result);
  older.run.resultId = "result-report-0";
  older.run.startedAt = "2026-07-27T01:00:00.000Z";
  const fetched = [];
  const loader = createAllRunsLoader({
    entries: [{ resultId: "result-report-0", path: "results/older.result.v3.json" }],
    manifestSource: {
      result: async path => {
        fetched.push(path);
        return older;
      },
    },
    assertResult: value => value,
  });
  assert.equal(loader.loaded, false);
  assert.equal(loader.entryCount, 1);
  assert.deepEqual(fetched, []);
  await loader.load();
  assert.equal(loader.loaded, true);
  assert.deepEqual(fetched, ["results/older.result.v3.json"]);
  const rows = loader.rows(result, thresholds);
  assert.deepEqual(
    rows.map(row => [row.resultId, row.current]),
    [["result-report-1", true], ["result-report-0", false]],
  );
  assert.equal(rows[0].fixCount, 3);
  assert.ok(Number.isFinite(rows[0].medianAccuracyM));
  assert.ok(Number.isFinite(rows[0].noPositionPercent));
});

test("row scalars come straight from the analysis lanes", () => {
  const analysis = analyzeReportResult(result, thresholds);
  const row = allRunsRow(result, analysis, result);
  assert.equal(row.current, true);
  assert.equal(row.label, "mobile · Report handset · FixtureOS 1 · band 5");
  assert.equal(row.fixCount, analysis.fixes.accuracy.uniqueFixCount);
  assert.equal(row.withinConfidencePercent, analysis.fixes.accuracy.withinConfidencePercent);
  assert.equal(row.noFreshFixPercent, analysis.fixes.freshness.noFreshFixPercent);
});

test("section renders load action, empty state, and the loaded table", () => {
  assert.equal(renderAllRunsSection(null), "");
  assert.match(
    renderAllRunsSection({ entryCount: 3, loaded: false, rows: [] }),
    /data-load-all-runs[\s\S]*Load all 4 campus runs/,
  );
  assert.match(
    renderAllRunsSection({ entryCount: 0, loaded: false, rows: [] }),
    /No other deployed campus runs/,
  );
  const analysis = analyzeReportResult(result, thresholds);
  const html = renderAllRunsSection({
    entryCount: 1,
    loaded: true,
    rows: [allRunsRow(result, analysis, result)],
  });
  assert.match(html, /All campus runs/);
  assert.match(html, /is-current-run/);
  assert.match(html, /this run/);
  assert.match(html, /Report fixture route/);
  assert.match(html, /No position \(%\)/);
});
