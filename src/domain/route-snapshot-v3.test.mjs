import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateRouteSnapshot } from "./route-snapshot-v3.mjs";

const definition = JSON.parse(await readFile(
  new URL("./fixtures/definition.valid.json", import.meta.url),
));

test("route snapshot accepts the fixture and enforces immutable geometry shape", () => {
  assert.deepEqual(validateRouteSnapshot(definition.route), []);
  const invalid = structuredClone(definition.route);
  invalid.legs[0].geometry = [];
  invalid.stops[0].provenance.method = "guessed";
  const errors = validateRouteSnapshot(invalid).join("\n");
  assert.match(errors, /geometry: must contain at least 2 item/);
  assert.match(errors, /provenance\.method: unsupported placement method/);
});

test("GPS provenance is auditable and a checkpoint must name its target", () => {
  const invalid = structuredClone(definition.route);
  invalid.stops[0].provenance = {
    method: "gps",
    accuracyM: -1,
    capturedAt: "not-a-time",
    adjusted: "no",
  };
  invalid.checkpoints[0].stopId = null;
  const errors = validateRouteSnapshot(invalid).join("\n");
  assert.match(errors, /provenance\.accuracyM/);
  assert.match(errors, /provenance\.capturedAt/);
  assert.match(errors, /provenance\.capturedPosition/);
  assert.match(errors, /provenance\.adjusted/);
  assert.match(errors, /checkpoints\.0: must reference its stop or leg/);

  const valid = structuredClone(definition.route);
  valid.stops[0].provenance = {
    method: "gps",
    accuracyM: 12,
    capturedAt: "2026-07-28T00:00:00.000Z",
    capturedPosition: { lng: 170.5, lat: -45.87 },
    adjusted: true,
  };
  assert.deepEqual(validateRouteSnapshot(valid), []);
});

test("GPS captured position requires numeric longitude and latitude", () => {
  const invalid = structuredClone(definition.route);
  invalid.stops[0].provenance = {
    method: "gps",
    accuracyM: 12,
    capturedAt: "2026-07-28T00:00:00.000Z",
    capturedPosition: { lng: "170.5" },
    adjusted: false,
  };
  const errors = validateRouteSnapshot(invalid).join("\n");
  assert.match(errors, /capturedPosition\.lng: must be a finite number/);
  assert.match(errors, /capturedPosition\.lat: must be a finite number/);
});

test("wrong collection types report issues instead of throwing", () => {
  const invalid = structuredClone(definition.route);
  invalid.stops = {};
  invalid.legs[0].geometry = {};
  assert.doesNotThrow(() => validateRouteSnapshot(invalid));
  const errors = validateRouteSnapshot(invalid).join("\n");
  assert.match(errors, /stops: must be an array/);
  assert.match(errors, /geometry: must be an array/);
});
