// FEATURE:      Customer-filtered survey dashboard
// SURFACE:      node --test src/features/dashboard/dashboard.test.mjs
// WHY TOGETHER: Fixture rendering and mount behavior prove the dashboard capability.
// STATE:        Minimal fake root markup
// RULES:        Use injected manifests and no browser or network.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { mountDashboard, renderDashboard } from "./dashboard.mjs";

const manifest = {
  schemaVersion: 3,
  customerId: "customer-a",
  customerName: "Customer <A>",
  surveys: [{
    surveyId: "survey-a", surveyName: "Ward walk", campusId: "566", routeId: "route-a",
  }],
  results: [{
    resultId: "result-a", surveyId: "survey-a",
    customerId: "customer-a", campusId: "566", completionStatus: "completed",
    exportedAt: "2026-07-28T01:00:00Z", path: "results/a.result.v3.json",
    device: { name: "Phone", type: "mobile", os: "OS 1" }, band: "5",
  }],
};

test("dashboard renders one customer's surveys, devices, and Report Player launch", async () => {
  const html = renderDashboard({
    customerName: "Customer <A>",
    campuses: [{
      campusId: "566", customerId: "customer-a", runCount: 4, surveyCount: 1,
    }],
    surveys: [{
      ...manifest.surveys[0],
      results: [{ ...manifest.results[0], deviceLabel: "Phone · mobile · OS 1 · 5 GHz" }],
    }],
  }, "/wifi-survey-v3/report-player/");
  assert.match(html, /Customer &lt;A&gt;/);
  assert.ok(html.indexOf("Consolidated issue report") < html.indexOf("Ward walk"));
  assert.match(html, /4 completed runs/);
  assert.match(html, /customer_id=customer-a&amp;campus_id=566&amp;view=overview/);
  assert.match(html, /Phone · mobile · OS 1 · 5 GHz/);
  assert.match(html, /Open Report Player/);
  assert.match(html, /wifi-survey-v3\/report-player\/\?customer_id=customer-a/);
  const root = fakeRoot();
  const model = await mountDashboard({
    root,
    customerId: "customer-a",
    manifestSource: { customer: async () => manifest },
    reportPlayerBase: "/wifi-survey-v3/report-player/",
  });
  assert.equal(model.customerId, "customer-a");
  assert.match(root.innerHTML, /Ward walk/);
  assert.match(root.innerHTML, /Consolidated issue report/);
  assert.match(root.innerHTML, /wifi-survey-v3\/report-player\//);
  assert.equal(root.busy, false);
});

function fakeRoot() {
  return {
    innerHTML: "",
    busy: false,
    setAttribute(name) { if (name === "aria-busy") this.busy = true; },
    removeAttribute(name) { if (name === "aria-busy") this.busy = false; },
  };
}

test("dashboard CSS keeps survey and result identity responsive", async () => {
  const css = await readFile(new URL("./dashboard.css", import.meta.url), "utf8");
  assert.match(css, /\.dashboard-survey/);
  assert.match(css, /\.dashboard-launch/);
  assert.match(css, /@media \(max-width: 700px\)/);
});

test("consolidated dashboard component remains separate from raw run launches", async () => {
  const css = await readFile(
    new URL("./dashboard-consolidated.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /\.dashboard-consolidated/);
  assert.match(css, /\.dashboard-consolidated-launch/);
  assert.match(css, /@media \(max-width: 700px\)/);
});
