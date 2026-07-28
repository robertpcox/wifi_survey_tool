import assert from "node:assert/strict";
import test from "node:test";

import { createMapLayers } from "./layers.mjs";

test("Creator v3 geometry and checkpoint types draw without legacy conversion", () => {
  const sources = new Map();
  const map = {
    getSource: id => sources.get(id),
    getLayer: () => null,
    addSource(id, definition) {
      sources.set(id, {
        data: definition.data,
        setData(data) {
          this.data = data;
        },
      });
    },
    addLayer() {},
    setPaintProperty() {},
  };
  const adapter = createMapLayers(map, () => 1);
  adapter.drawRoute([{
    geometry: [
      { lng: 170.1, lat: -45.1, z: 1 },
      { lng: 170.2, lat: -45.2, z: 1 },
    ],
  }]);
  adapter.drawWaypoints([
    { lng: 1, lat: 2, z: 3, type: "intermediate" },
  ]);
  assert.equal(
    sources.get("route-lines").data.features[0].geometry.type,
    "LineString",
  );
  assert.deepEqual(
    sources.get("wp-pts").data.features[0].properties,
    { z: 3, state: "pending", kind: "intermediate" },
  );
});
