// FEATURE:      Consolidated overview repaint boundary
// SURFACE:      node --test src/features/report-player/report-collection-repaint.test.mjs
// WHY TOGETHER: Run loading and the resulting camera fit form one completion contract.
// STATE:        Deferred map repaint
// RULES:        Overview readiness cannot resolve before its asynchronous map repaint.
// PROVENANCE:   Consolidated report startup ordering

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createReportCollectionController } from "./report-collection-controller.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("overview loading awaits its asynchronous map repaint", async () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30,
  });
  const state = {
    result, analysis, thresholds: analysis.thresholds, exceptions: [],
    manifest: { results: [] },
  };
  const repaint = deferred();
  const controller = createReportCollectionController({
    store: { snapshot: () => state },
    manifestSource: { result: async () => structuredClone(result) },
    surface: { adapter: {} },
  });
  let settled = false;
  const work = controller.loadOverview(async () => {
    await repaint.promise;
  }).then(() => { settled = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  repaint.resolve();
  await work;
  assert.equal(settled, true);
});

function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}
