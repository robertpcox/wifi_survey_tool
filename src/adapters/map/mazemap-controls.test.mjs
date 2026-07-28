import test from "node:test";
import assert from "node:assert/strict";
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
  controls.focusWaypoint({ seq: 2, lng: 170.5, lat: -45.8, z: 4 });
  assert.equal(markers[0].options.glyph, "3");
  assert.deepEqual(markers[0].lngLat, { lng: 170.5, lat: -45.8 });
  assert.equal(map.setZ, 4);
  assert.deepEqual(map.easyCamera, {
    center: [170.5, -45.8], zoom: 19, duration: 350,
  });
  map.easeTo = undefined;
  map.setZLevel = undefined;
  map.setZlevel = value => { map.legacyZ = value; };
  map.flyTo = camera => { map.flyCamera = camera; };
  controls.focusWaypoint({ seq: 3, lng: 1, lat: 2, z: 5 });
  assert.equal(markers[0].removed, true);
  assert.equal(map.legacyZ, 5);
  assert.deepEqual(map.flyCamera, { center: [1, 2], zoom: 19, duration: 350 });
});
