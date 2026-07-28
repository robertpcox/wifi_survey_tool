import assert from "node:assert/strict";
import test from "node:test";

import { createRouteLegV3 } from "./creator-route-v3.mjs";
import {
  authorSurveyDefinitionV3,
  immutableDefinitionCopy,
  importSurveyDefinitionV3,
} from "./definition-authoring-v3.mjs";

const EARTH_RADIUS_M = 6_371_000;
const now = () => new Date("2026-07-28T01:02:03.000Z");
const UUID_ONE = "11111111-1111-4111-8111-111111111111";
const UUID_TWO = "22222222-2222-4222-8222-222222222222";
const uuidCrypto = (...ids) => {
  let index = 0;
  return { subtle: globalThis.crypto.subtle, randomUUID: () => ids[index++] };
};
const pointAt = distanceM => ({
  lng: distanceM / EARTH_RADIUS_M * 180 / Math.PI,
  lat: 0,
  z: 0,
});

function authoringInput() {
  const stops = [
    {
      id: "stop-a", name: "Start", ...pointAt(0), poiId: null,
      locationType: "room", provenance: { method: "map" },
      _mapContext: { buildingId: "building-one", floorName: "Ground" },
    },
    {
      id: "stop-b", name: "Finish", ...pointAt(20), poiId: null,
      locationType: "room", provenance: { method: "map" },
    },
  ];
  return {
    meta: {
      surveyId: "caller-supplied-id-is-ignored",
      surveyName: "Level zero",
      customerId: "customer-one",
      customerName: "Customer One",
      campusId: "campus-one",
      campusName: "Campus One",
      timezone: "Australia/Melbourne",
      buildings: [{ id: "building-one", name: "Building One" }],
      zLevels: [0],
      zLevelNames: { 0: "Ground" },
      positionSourceId: "mazemap-cloud",
      sourceConfig: {
        configId: "config-one",
        pollIntervalMs: 2000,
        proxyBase: "/positioning",
      },
      credentialRequirements: {
        mapAccess: true, appId: true, appKey: true, clientIp: true,
      },
      authorNotes: null,
      authorName: null,
      device: "must-not-export",
      band: "must-not-export",
    },
    routeId: "route-one",
    stops,
    legs: [createRouteLegV3(stops[0], stops[1], stops, 0)],
    checkpointSpacingM: 10,
    checkpointDwellSeconds: 5,
  };
}

test("authoring returns a validated deeply immutable definition", async () => {
  const definition = await authorSurveyDefinitionV3(authoringInput(), {
    now, cryptoRef: uuidCrypto(UUID_ONE),
  });
  assert.equal(definition.meta.surveyId, UUID_ONE);
  assert.equal(definition.meta.route.estimatedDurationSeconds, 35);
  assert.equal(definition.route.checkpoints.length, 3);
  assert.equal(definition.meta.createdAt, now().toISOString());
  assert.equal(definition.route.stops[0].poiName, null);
  assert.equal("_mapContext" in definition.route.stops[0], false);
  assert.equal("device" in definition.meta, false);
  assert.equal("band" in definition.meta, false);
  assert.ok(Object.isFrozen(definition));
  assert.ok(Object.isFrozen(definition.route.legs[0].geometry));
  assert.ok(Object.isFrozen(definition.meta.sourceConfig));
});

test("import and unchanged reauthoring preserve every definition value", async () => {
  const authored = await authorSurveyDefinitionV3(authoringInput(), {
    now, cryptoRef: uuidCrypto(UUID_ONE),
  });
  const imported = importSurveyDefinitionV3(authored);
  imported.stops[0]._mapContext = { buildingId: "building-one", floorName: "Ground" };
  const reauthored = await authorSurveyDefinitionV3(imported, {
    now: () => new Date("2030-01-01T00:00:00.000Z"),
    cryptoRef: uuidCrypto(UUID_TWO),
  });
  assert.deepEqual(reauthored, authored);
  assert.equal(reauthored.meta.surveyId, authored.meta.surveyId);
  assert.equal(reauthored.route.hash, authored.route.hash);
  const copy = immutableDefinitionCopy(authored);
  assert.deepEqual(copy, authored);
  assert.notEqual(copy, authored);
  assert.ok(Object.isFrozen(copy.route.checkpoints));
});

test("a checkpoint-plan change rotates survey ID and route version", async () => {
  const cryptoRef = uuidCrypto(UUID_ONE, UUID_TWO);
  const authored = await authorSurveyDefinitionV3(authoringInput(), { now, cryptoRef });
  const imported = importSurveyDefinitionV3(authored);
  imported.checkpointSpacingM = 20;
  const changed = await authorSurveyDefinitionV3(imported, { now, cryptoRef });
  assert.equal(changed.meta.surveyId, UUID_TWO);
  assert.notEqual(changed.route.hash, authored.route.hash);
  assert.equal(changed.route.version, authored.route.version + 1);
  assert.equal(changed.meta.route.version, changed.route.version);
});

test("authoring failures retain precise validator field paths", async () => {
  const input = authoringInput();
  input.meta.customerName = "";
  await assert.rejects(
    authorSurveyDefinitionV3(input, { now }),
    /meta\.customerName: must be a non-empty string/,
  );
});

test("authoring rejects missing or incorrectly linked ordered legs", async () => {
  const missing = authoringInput();
  missing.stops.push({ ...missing.stops[1], id: "stop-c", name: "Third" });
  await assert.rejects(
    authorSurveyDefinitionV3(missing, { now }),
    /route\.legs: must contain exactly 2 ordered leg/,
  );
  const mislinked = authoringInput();
  mislinked.legs[0].fromStopId = "stop-b";
  await assert.rejects(
    authorSurveyDefinitionV3(mislinked, { now }),
    /route\.legs\.0\.fromStopId: must match stop 0/,
  );
});
