import assert from "node:assert/strict";
import test from "node:test";

import {
  assertCreatorCampus,
  fieldsFromDefinition,
  parseCreatorFields,
  parseCreatorPlanFields,
} from "./form.mjs";

function fields() {
  return {
    surveyName: "Route A",
    customerId: "customer-a",
    customerName: "Customer A",
    campusId: "campus-a",
    campusName: "Campus A",
    timezone: "Australia/Melbourne",
    routeId: "route-a",
    positionSourceId: "mazemap-cloud",
    configId: "1185",
    pollIntervalMs: "2000",
    proxyBase: "/proxy",
    needsMapAccess: true,
    needsAppId: true,
    needsAppKey: false,
    needsClientIp: true,
    authorName: "",
    authorNotes: "Check lifts",
    spacingM: "10",
    dwellSeconds: "5",
  };
}

test("parseCreatorFields builds contract metadata and checkpoint plan", () => {
  const coverage = {
    buildings: [
      { id: "a", name: "Building A" },
      { id: "b", name: "Building B" },
    ],
    zLevels: [0, 1],
    zLevelNames: { 0: "Ground", 1: "First" },
  };
  const result = parseCreatorFields(fields(), coverage);
  assert.deepEqual(result.meta.buildings, [
    { id: "a", name: "Building A" },
    { id: "b", name: "Building B" },
  ]);
  assert.deepEqual(result.meta.zLevels, [0, 1]);
  assert.deepEqual(result.meta.zLevelNames, { 0: "Ground", 1: "First" });
  assert.deepEqual(result.plan, { spacingM: 10, dwellSeconds: 5 });
  assert.equal(result.meta.authorName, null);
  assert.deepEqual(result.meta.credentialRequirements, {
    mapAccess: true,
    appId: true,
    appKey: true,
    clientIp: true,
  });
  assert.equal("device" in result.meta, false);
  assert.equal("band" in result.meta, false);
});

test("parseCreatorFields names malformed or missing fields precisely", () => {
  assert.throws(
    () => parseCreatorFields({ ...fields(), customerId: "" }),
    /customerId: is required/,
  );
  assert.throws(
    () => parseCreatorFields({ ...fields(), spacingM: "0" }),
    /spacingM: must be greater than zero/,
  );
});

test("checkpoint plan parses before definition metadata is complete", () => {
  assert.deepEqual(parseCreatorPlanFields({
    spacingM: "10",
    dwellSeconds: "5",
  }), {
    spacingM: 10,
    dwellSeconds: 5,
  });
});

test("fieldsFromDefinition preserves metadata and immutable plan on import", () => {
  const coverage = {
    buildings: [{ id: "a", name: "Building A" }],
    zLevels: [0],
    zLevelNames: { 0: "Ground" },
  };
  const parsed = parseCreatorFields(fields(), coverage);
  const definition = {
    meta: {
      ...parsed.meta,
      route: {
        checkpointSpacingM: 10,
        checkpointDwellSeconds: 5,
      },
    },
    route: { routeId: "route-a", version: 2 },
  };
  assert.deepEqual(
    parseCreatorFields(fieldsFromDefinition(definition), coverage),
    parsed,
  );
});

test("configured map campus must match authored metadata", () => {
  const meta = { campusId: "566" };
  assert.doesNotThrow(() => assertCreatorCampus(meta, 566));
  assert.doesNotThrow(() => assertCreatorCampus(meta, () => "566"));
  assert.throws(() => assertCreatorCampus(meta), /Engage MazeMap/);
  assert.throws(
    () => assertCreatorCampus(meta, 42),
    /campusId: must match the engaged map campus 42/,
  );
});
