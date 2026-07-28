import assert from "node:assert/strict";
import test from "node:test";

import { createDefinitionFiles } from "./definition-files.mjs";

const definition = {
  schemaVersion: 3,
  meta: {
    surveyId: "00000000-0000-4000-8000-000000000001",
    surveyName: "Survey A",
    customerId: "customer-a",
    customerName: "Customer A",
    campusId: "campus-a",
    campusName: "Campus A",
    timezone: "Australia/Melbourne",
    buildings: [{ id: "a", name: "A" }],
    zLevels: [0],
    zLevelNames: { 0: "Ground" },
    positionSourceId: "mazemap-cloud",
    authorNotes: null,
    sourceConfig: {
      configId: "1",
      pollIntervalMs: 2000,
      proxyBase: "/proxy",
    },
    credentialRequirements: {
      mapAccess: false,
      appId: true,
      appKey: true,
      clientIp: true,
    },
    route: {
      checkpointSpacingM: 10,
      checkpointDwellSeconds: 5,
    },
    createdAt: "2026-07-28T00:00:00.000Z",
    authorName: null,
  },
  route: { routeId: "route-a", version: 1 },
};

test("definition files validate, name, and download exported JSON", async () => {
  const authoredWith = [];
  const downloads = [];
  const state = {
    imported: null,
    planLocked: true,
    route: { legs: [{ geometry: [{ z: 0 }] }] },
    stops: [
      {
        z: 0,
        _mapContext: {
          building: { id: "a", name: "A" },
          floor: { id: "f", name: "Ground", z: 0 },
        },
      },
      { z: 0, locationType: "outdoors", provenance: { method: "gps" } },
    ],
  };
  const view = {
    readFields: () => creatorFields(),
    setStatus() {},
  };
  const files = createDefinitionFiles({
    configuredCampusId: "campus-a",
    downloadDefinition: async (...args) => downloads.push(args),
    state,
    view,
    workflow: {
      author: async (_parsed, _route, previous) => {
        authoredWith.push(previous);
        return definition;
      },
      importDefinition: value => ({ previousDefinition: value }),
    },
  });
  assert.equal(await files.exportDefinition(), definition);
  assert.equal(
    downloads[0][0],
    "00000000-0000-4000-8000-000000000001.definition.v3.json",
  );
  assert.equal(JSON.parse(downloads[0][1]).schemaVersion, 3);
  const baseline = state.imported;
  assert.equal(authoredWith[0], null);
  await files.exportDefinition();
  assert.equal(authoredWith[1], baseline);
  state.planLocked = false;
  await assert.rejects(files.exportDefinition(), /Lock the checkpoint plan/);
});

test("definition import preserves immutable geometry without routing", async () => {
  const state = {};
  let renders = 0;
  const imported = {
    checkpointDwellSeconds: 5,
    checkpointSpacingM: 10,
    legs: [{ id: "leg-1" }],
    previousDefinition: definition,
    stops: [{ id: "a" }, { id: "b" }],
  };
  const view = {
    importFile: () => ({ name: "survey.json" }),
    setPlanLocked(value) {
      assert.equal(value, true);
    },
    setStatus() {},
    writeFields(fields) {
      assert.equal(fields.campusId, "campus-a");
      assert.equal("surveyId" in fields, false);
    },
  };
  const files = createDefinitionFiles({
    configuredCampusId: "campus-a",
    readDefinition: async () => definition,
    render: () => renders++,
    state,
    view,
    workflow: {
      importDefinition: value => {
        assert.equal(value, definition);
        return imported;
      },
      reviewImported: () => ({ legs: imported.legs }),
    },
  });
  assert.equal(await files.importDefinition(), definition);
  assert.equal(renders, 1);
  assert.notEqual(state.stops, imported.stops);
  assert.equal(state.route.legs[0].id, "leg-1");
});

function creatorFields() {
  return {
    surveyName: "Survey A",
    customerId: "customer-a",
    customerName: "Customer A",
    campusId: "campus-a",
    campusName: "Campus A",
    timezone: "Australia/Melbourne",
    routeId: "route-a",
    positionSourceId: "mazemap-cloud",
    configId: "1",
    pollIntervalMs: 2000,
    proxyBase: "/proxy",
    spacingM: 10,
    dwellSeconds: 5,
  };
}
