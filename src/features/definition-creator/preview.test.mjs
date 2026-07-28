import assert from "node:assert/strict";
import test from "node:test";

import { routePreviewMarkup } from "./preview.mjs";

test("route preview renders exact geometry, checkpoints, and safe stop labels", () => {
  const stops = [
    { id: "a", name: "Start <west>", lng: 170.5, lat: -45.87, z: 0 },
    { id: "b", name: "Finish", lng: 170.51, lat: -45.88, z: 1 },
  ];
  const legs = [{
    id: "leg-1",
    geometry: [
      { lng: 170.5, lat: -45.87, z: 0 },
      { lng: 170.505, lat: -45.875, z: 0 },
      { lng: 170.51, lat: -45.88, z: 1 },
    ],
  }];
  const checkpoints = [
    { sequence: 0, lng: 170.5, lat: -45.87 },
    { sequence: 1, lng: 170.51, lat: -45.88 },
  ];
  const markup = routePreviewMarkup(stops, legs, checkpoints);
  assert.match(markup, /class="route-line"/);
  assert.equal((markup.match(/class="checkpoint-dot"/g) || []).length, 2);
  assert.equal((markup.match(/class="stop-dot"/g) || []).length, 2);
  assert.match(markup, /Start &lt;west&gt;/);
  assert.doesNotMatch(markup, /Start <west>/);
});

test("empty preview gives an instruction instead of invalid SVG coordinates", () => {
  assert.match(routePreviewMarkup([], [], []), /Add a stop/);
});
