// FEATURE:      Report Player result loading
// SURFACE:      node --test src/features/report-player/result-loader.test.mjs
// WHY TOGETHER: URL, manifest, validation, and upload assertions protect one load boundary.
// STATE:        Parsed report fixture
// RULES:        Use the compact v3 fixture and injected static source.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  assertReportResult,
  campusRunEntries,
  comparisonEntries,
  loadSelectedResult,
  resultSelectionFromUrl,
} from "./result-loader.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const entry = {
  resultId: result.run.resultId,
  surveyId: result.run.surveyId,
  campusId: result.run.campusId,
  routeHash: result.run.routeHash,
  completionStatus: "completed",
  path: "results/report.result.v3.json",
};

test("loader resolves IDs through one customer manifest and validates coordinates", async () => {
  const selection = resultSelectionFromUrl(
    "https://survey.test/report-player/?customer_id=customer-report&result_id=result-report-1",
  );
  const loaded = await loadSelectedResult({
    selection,
    manifestSource: {
      customer: async () => ({
        customerId: "customer-report",
        results: [entry],
      }),
      result: async path => {
        assert.equal(path, entry.path);
        return result;
      },
    },
  });
  assert.equal(loaded.result, result);
  assert.equal(loaded.initialView, "analysis");
  assert.equal(loaded.consolidated, false);
  const malformed = structuredClone(result);
  malformed.polls[0].normalized.lng = Number.NaN;
  assert.throws(() => assertReportResult(malformed), /normalized\.lng must be finite/);
});

test("campus overview URL chooses the newest eligible seed deterministically", async () => {
  const older = { ...entry, resultId: "older", exportedAt: "2026-07-28T00:00:00Z" };
  const newest = { ...entry, exportedAt: "2026-07-29T00:00:00Z" };
  const selection = resultSelectionFromUrl(
    "https://survey.test/report-player/?customer_id=customer-report&campus_id=566&view=overview",
  );
  assert.deepEqual(selection, {
    customerId: "customer-report",
    resultId: null,
    campusId: "566",
    view: "overview",
  });
  const loaded = await loadSelectedResult({
    selection,
    manifestSource: {
      customer: async () => ({
        customerId: "customer-report",
        results: [older, newest, {
          ...newest,
          resultId: "excluded",
          reviewedExceptions: [{ disposition: "exclude-run" }],
        }],
      }),
      result: async path => {
        assert.equal(path, newest.path);
        return result;
      },
    },
  });
  assert.equal(loaded.consolidated, true);
  assert.equal(loaded.initialView, "overview");
});

test("comparison discovery uses completed matching manifest entries", () => {
  const candidate = { ...entry, resultId: "result-report-2" };
  const entries = comparisonEntries({
    results: [
      entry,
      candidate,
      { ...candidate, resultId: "aborted", completionStatus: "aborted" },
      { ...candidate, resultId: "other", routeHash: "other" },
    ],
  }, result);
  assert.deepEqual(entries.map(item => item.resultId), ["result-report-2"]);
});

test("campus discovery keeps every completed campus run, newest first", () => {
  const campus = {
    ...entry,
    campusId: result.run.campusId,
    exportedAt: "2026-07-29T01:00:00.000Z",
  };
  const entries = campusRunEntries({
    results: [
      campus,
      {
        ...campus,
        resultId: "other-route",
        routeHash: "different",
        surveyId: "different-survey",
        exportedAt: "2026-07-30T01:00:00.000Z",
      },
      { ...campus, resultId: "aborted", completionStatus: "aborted" },
      { ...campus, resultId: "other-campus", campusId: "999" },
      {
        ...campus,
        resultId: "excluded",
        reviewedExceptions: [{ disposition: "exclude-run" }],
      },
    ],
  }, { ...result, run: { ...result.run, resultId: "someone-else" } });
  assert.deepEqual(
    entries.map(item => item.resultId),
    ["other-route", result.run.resultId],
  );
  assert.deepEqual(campusRunEntries(null, result), []);
});
