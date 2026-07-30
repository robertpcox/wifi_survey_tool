import test from "node:test";
import assert from "node:assert/strict";
import { bearingTo } from "./camera-bearing.mjs";
import { createMapControls } from "./mazemap-controls.mjs";

test("map controls retain marker, floor, camera, and SDK fallbacks", () => {
  const markers = [];
  class MazeMarker {
    constructor(options) { this.options = options; markers.push(this); }
    setLngLat(value) { this.lngLat = value; return this; }
    addTo(map) { this.map = map; return this; }
    remove() { this.removed = true; }
  }
  const map = {
    easeTo(camera) { this.easyCamera = camera; },
    getZoom: () => 18,
    getZLevel: () => "2",
    setZLevel(z) { this.setZ = z; },
    stop() { this.stopped = true; },
  };
  let z = 1;
  const controls = createMapControls({
    currentZ: () => z,
    layers: () => null,
    map: () => map,
    sdk: () => ({ MazeMarker }),
    setCurrentZ: value => { z = value; },
  });
  assert.equal(controls.getMapZLevel(), 2);
  const target = {
    sequence: 2, seq: 8, lng: 170.5, lat: -45.8, z: 4,
  };
  const origin = { lng: 170.4, lat: -45.8 };
  assert.equal(controls.focusWaypoint(target, { origin }), true);
  assert.equal(markers[0].options.glyph, "3");
  assert.deepEqual(markers[0].lngLat, { lng: 170.5, lat: -45.8 });
  assert.equal(map.setZ, 4);
  assert.deepEqual(map.easyCamera, {
    center: [170.5, -45.8],
    zoom: 19,
    bearing: bearingTo(origin, target),
    pitch: 0,
    padding: { top: 112, right: 40, bottom: 176, left: 40 },
    duration: 350,
  });
  map.easeTo = undefined;
  map.setZLevel = undefined;
  map.setZlevel = value => { map.legacyZ = value; };
  map.flyTo = camera => { map.flyCamera = camera; };
  controls.focusWaypoint({ seq: 3, lng: 1, lat: 2, z: 5 });
  assert.equal(markers[0].removed, true);
  assert.equal(markers[1].options.glyph, "4");
  assert.equal(map.legacyZ, 5);
  assert.deepEqual(map.flyCamera, {
    center: [1, 2],
    zoom: 19,
    bearing: 0,
    pitch: 0,
    padding: { top: 112, right: 40, bottom: 176, left: 40 },
    duration: 350,
  });
  assert.equal(controls.focusWaypoint({ lng: "bad", lat: 2 }), false);
});

test("waypoint focus accepts a dynamic perspective pitch", () => {
  let pitch = 45;
  const cameras = [];
  const map = {
    easeTo(camera) { cameras.push(camera); },
    getZoom: () => 18,
    setZLevel() {},
  };
  class MazeMarker {
    setLngLat() { return this; }
    addTo() { return this; }
    remove() {}
  }
  const controls = createMapControls({
    currentZ: () => 0,
    focusPitch: () => pitch,
    layers: () => null,
    map: () => map,
    sdk: () => ({ MazeMarker }),
    setCurrentZ() {},
  });
  controls.focusWaypoint({ lng: 170.5, lat: -45.8, z: 1 });
  pitch = 0;
  controls.focusWaypoint({ lng: 170.6, lat: -45.9, z: 1 });
  assert.deepEqual(cameras.map(camera => camera.pitch), [45, 0]);
});

test("fitRoute bounds all finite route points north-up and centers one point", () => {
  const map = {
    fitBounds(bounds, options) { this.bounds = bounds; this.fit = options; },
    getZoom: () => 17,
    stop() { this.stops = (this.stops || 0) + 1; },
    easeTo(camera) { this.camera = camera; },
    setZLevel(z) { this.z = z; },
  };
  const controls = createMapControls({
    currentZ: () => 0,
    layers: () => null,
    map: () => map,
    sdk: () => ({}),
    setCurrentZ() {},
  });
  assert.equal(controls.fitRoute({
    legs: [{ geometry: [
      { lng: 170.4, lat: -45.8, z: 1 }, { lng: 170.7, lat: -46 },
      { lng: Number.NaN, lat: -46 },
    ] }],
    stops: [{ lng: 170.3, lat: -45.9 }],
    checkpoints: [{ lng: 170.6, lat: -45.7 }],
  }), true);
  assert.deepEqual(map.bounds, [[170.3, -46], [170.7, -45.7]]);
  assert.equal(map.z, 1);
  assert.deepEqual(map.fit, {
    padding: { top: 72, right: 48, bottom: 72, left: 48 },
    maxZoom: 19,
    bearing: 0,
    pitch: 0,
    duration: 350,
  });
  assert.equal(controls.fitRoute({
    stops: [{ lng: 170.5, lat: -45.8, z: 2 }],
  }), true);
  assert.equal(map.z, 2);
  assert.deepEqual(map.camera, {
    center: [170.5, -45.8],
    zoom: 18,
    bearing: 0,
    pitch: 0,
    padding: { top: 72, right: 48, bottom: 72, left: 48 },
    duration: 350,
  });
  assert.equal(controls.fitRoute({ stops: [{ lng: null, lat: -45 }] }), false);
});
