import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateRouteIntegrityV3 } from "./route-integrity-v3.mjs";

const route = JSON.parse(await readFile(
  new URL("./fixtures/definition.valid.json", import.meta.url),
)).route;

test("valid route has connected legs, exact endpoints, and complete checkpoints", () => {
  assert.deepEqual(validateRouteIntegrityV3(route), []);
});

test("disconnected geometry and checkpoint references are named precisely", () => {
  const invalid = structuredClone(route);
  invalid.legs.push(structuredClone(invalid.legs[0]));
  invalid.legs[0].fromStopId = "wrong-stop";
  invalid.legs[0].geometry[0].lng += 1;
  invalid.checkpoints[0].sequence = 3;
  invalid.checkpoints[0].stopId = "wrong-stop";
  invalid.totalDistanceM += 1;
  const errors = validateRouteIntegrityV3(invalid).join("\n");
  assert.match(errors, /legs: must connect each adjacent stop/);
  assert.match(errors, /legs\.0\.fromStopId/);
  assert.match(errors, /legs\.0\.geometry\.0/);
  assert.match(errors, /checkpoints\.0\.sequence/);
  assert.match(errors, /checkpoints\.0: stop reference is invalid/);
  assert.match(errors, /stops\.0\.id: requires a stop checkpoint/);
  assert.match(errors, /totalDistanceM/);
});
