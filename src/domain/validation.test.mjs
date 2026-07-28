import assert from "node:assert/strict";
import test from "node:test";

import {
  requirePaths,
  secretValuePaths,
  validationResult,
  valueAt,
} from "./validation.mjs";

test("path helpers find nested values and name missing requirements", () => {
  const input = { route: { stops: [{ id: "stop-a" }] } };
  assert.equal(valueAt(input, "route.stops.0.id"), "stop-a");
  assert.equal(valueAt(input, "route.stops.1.id"), undefined);
  const issues = [];
  requirePaths(input, ["route.stops.0.id", "route.hash"], issues);
  assert.deepEqual(issues, ["route.hash: is required"]);
});

test("secret paths reject values but permit boolean requirement flags", () => {
  const runtime = {};
  runtime[["app", "Key"].join("")] = ["planted", "value"].join("-");
  assert.deepEqual(secretValuePaths({
    requirements: { appKey: true, mapAccess: false },
    runtime,
  }), ["runtime.appKey"]);
  assert.deepEqual(validationResult([]), { valid: true, errors: [] });
});
