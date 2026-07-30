// FEATURE:      Dynamic room Runner browser findings
// SURFACE:      dynamicRoomBrowserFindings()
// WHY TOGETHER: Paired identity, hidden geometry, filenames, and setup retention form one receipt.
// STATE:        One valid and one deliberately broken browser snapshot
// RULES:        Any visible background route or identity drift is named.
// PROVENANCE:   Step 4 Runner dynamic-room browser acceptance

import assert from "node:assert/strict";
import test from "node:test";
import { dynamicRoomBrowserFindings } from "./runner_browser_dynamic.mjs";

const route = {
  hash: "route-hash",
  stops: [{}, {}],
  checkpoints: [
    { type: "stop", spacingBasisM: 5 },
    { type: "intermediate", spacingBasisM: 5 },
    { type: "intermediate", spacingBasisM: 5 },
    { type: "stop", spacingBasisM: 5 },
  ],
};
const valid = {
  routeFeatures: 0,
  definition: {
    meta: { surveyName: "Dynamic room survey", route: { checkpointSpacingM: 5 } },
    route,
  },
  definitionName: "survey.definition.v3.json",
  result: {
    run: { captureMode: "dynamic-room", routeHash: "route-hash" },
    route,
    checkIns: [{}, {}, {}, {}],
  },
  resultName: "result.result.v3.json",
  setupName: "Dynamic Android field device",
  storageEntries: 0,
};

test("valid dynamic browser receipt has no findings", () => {
  assert.deepEqual(dynamicRoomBrowserFindings(valid), []);
});

test("visible routing and drift are named", () => {
  const broken = structuredClone(valid);
  broken.routeFeatures = 1;
  broken.result.run.routeHash = "different";
  broken.result.run.captureMode = null;
  assert.deepEqual(dynamicRoomBrowserFindings(broken), [
    "background route became visible",
    "dynamic capture provenance missing",
    "paired export route identity drifted",
  ]);
});
