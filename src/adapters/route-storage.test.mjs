import test from "node:test";
import assert from "node:assert/strict";

import {
  createRouteRepository,
  savedRouteStops,
} from "./route-storage.mjs";

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem: () => value,
    setItem: (_key, next) => {
      value = next;
    },
    value: () => value,
  };
}

test("saved routes survive save/delete and malformed storage is isolated", () => {
  const storage = memoryStorage("{broken");
  const repository = createRouteRepository({
    storage,
    fetchImpl: async () => assert.fail("unexpected fetch"),
    storageKey: "test.routes",
  });

  assert.deepEqual(repository.savedRouteMap(), {});
  repository.saveRoute("Alpha", { stops: [{ id: 1 }] });
  repository.saveRoute("Beta", [{ id: 2 }]);
  assert.deepEqual(JSON.parse(storage.value()), {
    Alpha: { stops: [{ id: 1 }] },
    Beta: [{ id: 2 }],
  });
  repository.deleteRoute("Alpha");
  assert.deepEqual(repository.savedRouteMap(), { Beta: [{ id: 2 }] });
  assert.deepEqual(savedRouteStops([{ id: 2 }]), [{ id: 2 }]);
  assert.deepEqual(savedRouteStops({ stops: [{ id: 3 }] }), [{ id: 3 }]);
  assert.equal(savedRouteStops({}), undefined);
});

test("server manifest and route loads keep no-store and normalize entries", async () => {
  const calls = [];
  const route = { name: "Server route", stops: [] };
  const fetchImpl = async (url, options) => {
    calls.push([url, options]);
    if (url === "/manifest.json") {
      return {
        ok: true,
        json: async () => ({
          routes: [
            "route one.json",
            { file: "two.json", name: "Second", campusId: 566, floor: 2 },
          ],
        }),
      };
    }
    return { ok: true, json: async () => route };
  };
  const repository = createRouteRepository({
    storage: memoryStorage(),
    fetchImpl,
    manifestUrl: "/manifest.json",
  });

  assert.deepEqual(await repository.loadServerRouteManifest(), [
    { file: "route one.json", name: "route one", campusId: null, floor: null },
    { file: "two.json", name: "Second", campusId: 566, floor: 2 },
  ]);
  assert.equal(
    await repository.loadServerRoute({ file: "route one.json" }),
    route,
  );
  assert.deepEqual(calls, [
    ["/manifest.json", { cache: "no-store" }],
    ["/data/routes/route%20one.json", { cache: "no-store" }],
  ]);
});

test("manifest rejects missing arrays, unsafe files, and HTTP failures", async t => {
  const invalid = [
    [{ entries: [] }, "manifest has no routes array"],
    [{ routes: [""] }, "route 1 has an invalid file name"],
    [{ routes: ["../secret.json"] }, "route 1 has an invalid file name"],
    [{ routes: ["nested/route.json"] }, "route 1 has an invalid file name"],
    [{ routes: ["nested\\route.json"] }, "route 1 has an invalid file name"],
    [{ routes: ["route.txt"] }, "route 1 has an invalid file name"],
  ];
  for (const [manifest, message] of invalid) {
    await t.test(message + JSON.stringify(manifest), async () => {
      const repository = createRouteRepository({
        storage: memoryStorage(),
        fetchImpl: async () => ({ ok: true, json: async () => manifest }),
      });
      await assert.rejects(
        repository.loadServerRouteManifest(),
        new Error(message),
      );
    });
  }

  const failed = createRouteRepository({
    storage: memoryStorage(),
    fetchImpl: async () => ({ ok: false, status: 503 }),
  });
  await assert.rejects(failed.loadServerRouteManifest(), /HTTP 503/);
  await assert.rejects(failed.loadServerRoute({ file: "one.json" }), /HTTP 503/);
});
