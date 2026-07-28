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
