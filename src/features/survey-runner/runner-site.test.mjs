// FEATURE:      Runner customer and campus selection tests
// SURFACE:      URL defaults, validation, template retargeting, and map campus naming
// WHY TOGETHER: The site identity rules are one pure contract.
// STATE:        One template definition fixture
// RULES:        Unchanged sites keep the template; a new campus never inherits template floors.
// PROVENANCE:   Runner customer/campus entry request

import assert from "node:assert/strict";
import test from "node:test";
import {
  adoptMapCampusName,
  applyRunnerSite,
  runnerSiteFromUrl,
  runnerSiteIssues,
  runnerSiteValues,
  sameRunnerSite,
} from "./runner-site.mjs";

const template = {
  meta: {
    customerId: "292",
    customerName: "NTT - NDH",
    campusId: "566",
    campusName: "Dunedin Hospital",
    buildings: [{ id: "1013513", name: "Outpatient Building" }],
    zLevels: [1, 2],
    zLevelNames: { 1: "Level 0", 2: "Level 1" },
    sourceConfig: { configId: "1185", pollIntervalMs: 2000, proxyBase: "/proxy" },
  },
  route: { stops: [] },
};
const surveys = [{ customerId: "300", customerName: "Known Health" }];

test("share links supply customer and campus defaults", () => {
  assert.deepEqual(
    runnerSiteFromUrl("https://example.test/runner/?customer_id=300&campus_id=%20700%20"),
    { customerId: "300", campusId: "700" },
  );
  assert.deepEqual(runnerSiteFromUrl("not a url"), { customerId: null, campusId: null });
});

test("blank fields fall back to the template and invalid IDs are named", () => {
  assert.deepEqual(
    runnerSiteValues({ siteCampusId: " 700 " }, template),
    { customerId: "292", campusId: "700", configId: "1185" },
  );
  assert.deepEqual(runnerSiteIssues({ siteCustomerId: "", siteCampusId: "56a", siteConfigId: "0" }), [
    "campusId must be a positive whole number",
    "configId must be a positive whole number",
  ]);
});

test("an unchanged site returns the template itself", () => {
  const site = runnerSiteValues({}, template);
  assert.equal(applyRunnerSite(template, site, surveys), template);
});

test("a new customer and campus retarget a copy without template floors", () => {
  const site = { customerId: "300", campusId: "700", configId: "42" };
  const definition = applyRunnerSite(template, site, surveys);
  assert.notEqual(definition, template);
  assert.equal(template.meta.campusId, "566");
  assert.deepEqual(
    {
      customerId: definition.meta.customerId,
      customerName: definition.meta.customerName,
      campusId: definition.meta.campusId,
      campusName: definition.meta.campusName,
      buildings: definition.meta.buildings,
      zLevels: definition.meta.zLevels,
      zLevelNames: definition.meta.zLevelNames,
      configId: definition.meta.sourceConfig.configId,
    },
    {
      customerId: "300",
      customerName: "Known Health",
      campusId: "700",
      campusName: "Campus 700",
      buildings: [],
      zLevels: [],
      zLevelNames: {},
      configId: "42",
    },
  );
  assert.equal(sameRunnerSite(definition, template), false);
  const unknown = applyRunnerSite(template, { ...site, customerId: "301" }, surveys);
  assert.equal(unknown.meta.customerName, "Customer 301");
});

test("the loaded MazeMap campus name replaces the placeholder once", () => {
  const definition = applyRunnerSite(
    template,
    { customerId: "292", campusId: "700", configId: "1185" },
    surveys,
  );
  assert.equal(adoptMapCampusName(definition, { campusId: 566, campusName: "Wrong" }), false);
  assert.equal(adoptMapCampusName(definition, { campusId: 700, campusName: " North Campus " }), true);
  assert.equal(definition.meta.campusName, "North Campus");
  assert.equal(adoptMapCampusName(definition, { campusId: 700, campusName: "Again" }), false);
});
