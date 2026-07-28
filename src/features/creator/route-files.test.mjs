import assert from "node:assert/strict";
import test from "node:test";

import { createRouteFiles } from "./route-files.mjs";

function stop(label = "Stop A") {
  return {
    label,
    lat: -36.85,
    lng: 174.76,
    targetType: "point",
    z: 1,
  };
}

test("createRouteFiles preserves deterministic export and import handling", async () => {
  const routeState = { stops: [] };
  let routeName = "West / Lab!";
  const statuses = [];
  const view = {
    routeName: () => routeName,
    setStatus: (...value) => statuses.push(value),
  };
  const downloads = [];
  const saved = [];
  const applied = [];
  const refreshed = [];
  const makeDefinition = (name, stops = routeState.stops) => ({
    kind: "route",
    name,
    stops,
  });
  const files = createRouteFiles({
    downloadFile: (...args) => downloads.push(args),
    editor: {
      applyRoute: (...args) => applied.push(args),
    },
    makeDefinition,
    refreshSavedRoutes: key => refreshed.push(key),
    repository: {
      saveRoute: (...args) => saved.push(args),
    },
    routeState,
    view,
  });
  files.exportRoute();
  assert.deepEqual(statuses.at(-1), [
    "err",
    "Add at least one stop before exporting",
  ]);
  assert.equal(downloads.length, 0);
  routeState.stops = [stop()];
  files.exportRoute();
  assert.deepEqual(downloads[0], [
    "route-West-Lab.json",
    JSON.stringify({
      kind: "route",
      name: "West / Lab!",
      stops: routeState.stops,
    }, null, 2),
    "application/json",
  ]);
  assert.deepEqual(statuses.at(-1), [
    "ok",
    'Exported route "West / Lab!" in v2 format',
  ]);
  const input = {
    files: [{
      name: "route-Fallback.json",
      text: async () => JSON.stringify({
        campusId: 566,
        stops: [stop("Imported")],
      }),
    }],
    value: "selected",
  };
  await files.importRoute(input);
  assert.equal(input.value, "");
  assert.equal(applied[0][1], "Fallback");
  assert.equal(applied[0][2], false);
  assert.equal(applied[0][0][0].tag, "A");
  assert.equal(applied[0][0][0].label, "Imported");
  assert.equal(saved[0][0], "Fallback");
  assert.deepEqual(saved[0][1], {
    kind: "route",
    name: "Fallback",
    stops: applied[0][0],
  });
  assert.deepEqual(refreshed, ["local:Fallback"]);
  assert.match(statuses.at(-1)[1], /Imported and saved "Fallback" \(1 stops\)/);
  const invalid = {
    files: [{
      name: "route-Wrong.json",
      text: async () => JSON.stringify({
        campusId: 999,
        stops: [stop()],
      }),
    }],
    value: "selected",
  };
  await files.importRoute(invalid);
  assert.equal(invalid.value, "");
  assert.equal(saved.length, 1);
  assert.deepEqual(statuses.at(-1), [
    "err",
    "Route import failed: route campus 999 does not match campus 566",
  ]);
  await files.importRoute({ files: [], value: "unchanged" });
  assert.equal(saved.length, 1);
});
