// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      node --test src/domain/dashboard-selection.test.mjs
// WHY TOGETHER: Selection, filtering, and URL assertions prove one dashboard contract.
// STATE:        None
// RULES:        Test data models generated manifests and excludes aborted results.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import test from "node:test";

import {
  createDashboardModel,
  customerIdFromUrl,
  reportPlayerBaseFromUrl,
  reportPlayerUrl,
} from "./dashboard-selection.mjs";

const survey = { surveyId: "survey-a", surveyName: "Route A" };
const completed = {
  resultId: "result-a", surveyId: "survey-a",
  customerId: "customer-a", completionStatus: "completed",
  exportedAt: "2026-07-28T01:00:00Z", path: "results/a.result.v3.json",
  device: { name: "Handset", type: "mobile", os: "OS 1" }, band: "5",
};

test("dashboard model is customer-scoped and launches only completed results", () => {
  assert.equal(customerIdFromUrl("https://survey.test/?customer_id=customer-a"), "customer-a");
  assert.equal(customerIdFromUrl("https://survey.test/dashboard/customer-b"), "customer-b");
  assert.equal(customerIdFromUrl("https://survey.test/dashboard/index.html"), null);
  assert.equal(customerIdFromUrl("https://survey.test/src/apps/dashboard/index.html"), null);
  assert.equal(
    reportPlayerBaseFromUrl("https://survey.test/wifi-survey-v3/?customer_id=customer-a"),
    "/wifi-survey-v3/report-player/",
  );
  assert.equal(
    reportPlayerBaseFromUrl("https://survey.test/wifi-survey-v3/dashboard/"),
    "/wifi-survey-v3/report-player/",
  );
  assert.equal(
    reportPlayerBaseFromUrl("https://survey.test/wifi-survey-v3/dashboard"),
    "/wifi-survey-v3/report-player/",
  );
  assert.equal(
    reportPlayerBaseFromUrl("https://survey.test/src/apps/dashboard/index.html"),
    "/src/apps/report-player/",
  );
  const model = createDashboardModel({
    schemaVersion: 3,
    customerId: "customer-a",
    customerName: "Customer A",
    surveys: [survey],
    results: [completed, { ...completed, completionStatus: "aborted" }],
  }, "customer-a");
  assert.equal(model.surveys[0].results.length, 1);
  assert.match(model.surveys[0].results[0].deviceLabel, /Handset · mobile · OS 1 · 5 GHz/);
  assert.equal(model.surveys[0].results[0].device.clientIp, undefined);
  assert.equal(
    reportPlayerUrl(completed, "/wifi-survey-v3/report-player/"),
    "/wifi-survey-v3/report-player/?customer_id=customer-a&result_id=result-a",
  );
  assert.throws(() => reportPlayerUrl(completed), /base must be a directory URL/);
  assert.throws(() => createDashboardModel({
    schemaVersion: 3, customerId: "other", surveys: [], results: [],
  }, "customer-a"), /does not match/);
});
