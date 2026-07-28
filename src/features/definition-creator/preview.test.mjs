import assert from "node:assert/strict";
import test from "node:test";

import { routePreviewMarkup } from "./preview.mjs";

test("preview renders layered floor routes, rises, checkpoints, and safe labels", () => {
  const stops = [
    { id: "a", name: "Start <west>", lng: 170.5, lat: -45.87, z: 0 },
    { id: "b", name: "Finish", lng: 170.515, lat: -45.885, z: 1 },
  ];
  const legs = [{
    id: 'leg-"safe"',
    geometry: [
      { lng: 170.5, lat: -45.87, z: 0 },
      { lng: 170.505, lat: -45.875, z: 0 },
      { lng: 170.51, lat: -45.88, z: 1 },
      { lng: 170.515, lat: -45.885, z: 1 },
    ],
  }];
  const checkpoints = [
    { sequence: 0, lng: 170.5, lat: -45.87, z: 0 },
    { sequence: 1, lng: 170.515, lat: -45.885, z: 1 },
  ];
  const markup = routePreviewMarkup(stops, legs, checkpoints);
  assert.equal((markup.match(/class="route-level-plane"/g) || []).length, 2);
  assert.equal((markup.match(/class="route-line"/g) || []).length, 2);
  assert.equal((markup.match(/class="route-line route-rise"/g) || []).length, 1);
  assert.equal((markup.match(/class="checkpoint-dot"/g) || []).length, 2);
  assert.equal((markup.match(/class="stop-dot"/g) || []).length, 2);
  assert.ok(markup.indexOf('class="route-line"') < markup.lastIndexOf('class="route-line"'));
  assert.match(markup, /data-from-z="0" data-to-z="1"/);
  assert.match(markup, /data-leg-id="leg-&quot;safe&quot;"/);
  assert.match(markup, /Start &lt;west&gt;/);
  assert.doesNotMatch(markup, /Start <west>/);
  assert.match(markup, /id="creator-route-preview-title"/);
  assert.match(markup, /Higher z-levels are offset upward and right/);
});

test("higher floors move up and right, paint last, and keep route numbers", () => {
  const stops = [
    { id: "high", name: "High", lng: 170.5, lat: -45.87, z: 9 },
    { id: "low", name: "Low", lng: 170.5, lat: -45.87, z: -4 },
  ];
  const markup = routePreviewMarkup(stops, [], []);
  const low = marker(markup, "low");
  const high = marker(markup, "high");
  assert.equal(round(high.x - low.x), 14);
  assert.equal(round(high.y - low.y), -24);
  assert.equal(low.number, 2);
  assert.equal(high.number, 1);
  assert.ok(markup.indexOf('data-stop-id="low"') < markup.indexOf('data-stop-id="high"'));
  assert.ok(markup.indexOf('class="route-level-plane"') <
    markup.lastIndexOf('class="route-level-plane"'));
});

test("empty preview exposes accessible context and an instruction", () => {
  const markup = routePreviewMarkup([], [], []);
  assert.match(markup, /<title id="creator-route-preview-title">Empty route preview/);
  assert.match(markup, /<desc id="creator-route-preview-desc">/);
  assert.match(markup, /Add a stop/);
  assert.doesNotMatch(markup, /(?:NaN|Infinity)/);
});

function marker(markup, id) {
  const match = markup.match(new RegExp(
    `data-stop-id="${id}"[^>]*><circle cx="([^"]+)" cy="([^"]+)"[^>]*></circle>`
      + `<text[^>]*>(\\d+)</text>`,
  ));
  assert.ok(match, `marker ${id} was rendered`);
  return { x: Number(match[1]), y: Number(match[2]), number: Number(match[3]) };
}

function round(value) {
  return Math.round(value * 10) / 10;
}
