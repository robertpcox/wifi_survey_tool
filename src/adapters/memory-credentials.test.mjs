import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryCredentialStore } from "./memory-credentials.mjs";

test("credential values exist only inside the adapter and clear explicitly", () => {
  const credentials = createMemoryCredentialStore();
  const value = ["runtime", "only", "value"].join("-");
  credentials.set("mapAccess", value);
  assert.equal(credentials.has("mapAccess"), true);
  assert.equal(credentials.read("mapAccess"), value);
  assert.deepEqual(credentials.missing({ mapAccess: true, appKey: true }), ["appKey"]);
  credentials.clear("mapAccess");
  assert.equal(credentials.read("mapAccess"), null);
});

test("credential adapter trims values and rejects unknown fields", () => {
  const credentials = createMemoryCredentialStore();
  credentials.set("appId", "  runtime-id  ");
  assert.equal(credentials.read("appId"), "runtime-id");
  credentials.set("appId", "");
  assert.equal(credentials.has("appId"), false);
  assert.throws(() => credentials.set("unknown", "value"), /Unsupported/);
});
