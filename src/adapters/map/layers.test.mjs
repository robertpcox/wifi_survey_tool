import test from "node:test";
import assert from "node:assert/strict";

import { createMapLayers } from "./layers.mjs";

function mapHarness() {
  const sources = new Map();
  const layers = new Map();
  const filters = [];
  const map = {
    sources,
    layers,
    filters,
    getSource: id => sources.get(id),
    getLayer: id => layers.get(id),
    addSource(id, definition) {
      sources.set(id, {
        data: definition.data,
        setData(data) {
          this.data = data;
        },
      });
    },
    addLayer(definition) {
      layers.set(definition.id, definition);
    },
    setFilter(id, filter) {
      filters.push([id, filter]);
    },
    setPaintProperty() {},
  };
  return map;
}

test("ensureLayers registers the original sources and layers once", () => {
  const map = mapHarness();
  const adapter = createMapLayers(map, () => 1);
  adapter.ensureLayers();
  adapter.ensureLayers();

  assert.deepEqual([...map.sources.keys()], [
    "route-lines", "staged-leg", "cloud-trail", "lipi-trail",
    "cloud-pts", "lipi-pts", "wp-pts", "stop-pts",
  ]);
  assert.deepEqual([...map.layers.keys()], [
    "route-lines-lyr", "route-active-lyr", "staged-leg-lyr",
    "cloud-trail-lyr", "lipi-trail-lyr", "cloud-pts-lyr",
    "lipi-pts-lyr", "wp-pts-lyr", "stop-pts-lyr",
  ]);
  assert.deepEqual(map.layers.get("route-active-lyr").filter, [
    "==",
    ["get", "legIdx"],
    -1,
  ]);
  assert.deepEqual(map.layers.get("route-lines-lyr").layout, {
    "line-join": "round",
    "line-cap": "round",
  });
});

test("route, waypoint, stop, and active-leg drawing keeps GeoJSON shape", () => {
  const map = mapHarness();
  const adapter = createMapLayers(map, () => 1);
  adapter.drawRoute([{
    coords: [
      { lng: 170.1, lat: -45.1, z: 1 },
      { lng: 170.2, lat: -45.2, z: 1 },
    ],
  }]);
  adapter.drawWaypoints([
    { lng: 1, lat: 2, z: 3, state: "current", kind: "stop" },
  ]);
  adapter.drawStops([{ lng: 4, lat: 5, z: 6 }]);
  adapter.setActiveLeg(0);
  adapter.setActiveLeg(null);

  assert.deepEqual(map.sources.get("route-lines").data.features[0], {
    type: "Feature",
    properties: { legIdx: 0, z: 1 },
    geometry: {
      type: "LineString",
      coordinates: [[170.1, -45.1], [170.2, -45.2]],
    },
  });
  assert.deepEqual(map.sources.get("wp-pts").data.features[0], {
    type: "Feature",
    properties: { z: 3, state: "current", kind: "stop" },
    geometry: { type: "Point", coordinates: [1, 2] },
  });
  assert.deepEqual(map.sources.get("stop-pts").data.features[0], {
    type: "Feature",
    properties: { z: 6 },
    geometry: { type: "Point", coordinates: [4, 5] },
  });
  assert.deepEqual(map.filters, [
    ["route-active-lyr", ["==", ["get", "legIdx"], 0]],
    ["route-active-lyr", ["==", ["get", "legIdx"], -1]],
  ]);
});

test("trail drawing filters fixes, defaults floor, and marks only latest", () => {
  const map = mapHarness();
  const adapter = createMapLayers(map, () => 1);
  adapter.drawTrails([
    {
      source: "cloud",
      ok: true,
      ctx: "first",
      data: { longitude: 1, latitude: 2 },
    },
    { source: "cloud", ok: false, data: { longitude: 9, latitude: 9 } },
    {
      source: "cloud",
      ok: true,
      ctx: "latest",
      data: { longitude: 3, latitude: 4, zLevel: 1 },
    },
    {
      source: "lipi",
      ok: true,
      ctx: "only",
      data: { longitude: 5, latitude: 6, zLevel: 2 },
    },
  ]);

  assert.deepEqual(map.sources.get("cloud-trail").data.features[0].geometry, {
    type: "LineString",
    coordinates: [[1, 2], [3, 4]],
  });
  const cloudPoints = map.sources.get("cloud-pts").data.features;
  assert.deepEqual(cloudPoints.map(point => point.properties), [
    { z: 1, isLatest: false, ctx: "first" },
    { z: 1, isLatest: true, ctx: "latest" },
  ]);
  assert.deepEqual(map.sources.get("lipi-trail").data.features, []);
  assert.deepEqual(
    map.sources.get("lipi-pts").data.features[0].geometry.coordinates,
    [5, 6],
  );
});
