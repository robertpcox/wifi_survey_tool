import test from "node:test";
import assert from "node:assert/strict";

import {
  PERSISTED_PREFERENCE_IDS,
  restorePrefs,
} from "./preferences.mjs";

function element(value = "") {
  return {
    checked: false,
    listeners: [],
    value,
    addEventListener(type, listener) {
      assert.equal(type, "change");
      this.listeners.push(listener);
    },
  };
}

test("preferences restore and persist only non-secret fields", () => {
  assert.deepEqual(PERSISTED_PREFERENCE_IDS, [
    "configId",
    "clientIp",
    "pollInterval",
    "lipiUrl",
    "wpSpacing",
    "collectionTag",
    "cloudBase",
  ]);
  const secretIds = ["mapAccess", "appId", "appKey"];
  const ids = [...PERSISTED_PREFERENCE_IDS, "srcCloud", "srcLipi", ...secretIds];
  const elements = Object.fromEntries(ids.map(id => [id, element(`initial-${id}`)]));
  const values = new Map([
    ["test.configId", "1185"],
    ["test.clientIp", "10.0.0.8"],
    ["test.srcCloud", "1"],
    ["test.srcLipi", "0"],
  ]);
  const reads = [];
  const writes = [];
  const storage = {
    getItem(key) {
      reads.push(key);
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      writes.push([key, value]);
    },
  };
  const documentRef = {
    getElementById(id) {
      return elements[id];
    },
  };

  restorePrefs(documentRef, storage, "test.");

  assert.equal(elements.configId.value, "1185");
  assert.equal(elements.clientIp.value, "10.0.0.8");
  assert.equal(elements.pollInterval.value, "initial-pollInterval");
  assert.equal(elements.srcCloud.checked, true);
  assert.equal(elements.srcLipi.checked, false);
  assert.ok(reads.every(key => !secretIds.some(id => key.endsWith(id))));
  assert.ok(secretIds.every(id => elements[id].listeners.length === 0));

  elements.cloudBase.listeners[0]({ target: { value: "https://proxy.example" } });
  elements.srcCloud.listeners[0]({ target: { checked: false } });
  assert.deepEqual(writes, [
    ["test.cloudBase", "https://proxy.example"],
    ["test.srcCloud", "0"],
  ]);
});
