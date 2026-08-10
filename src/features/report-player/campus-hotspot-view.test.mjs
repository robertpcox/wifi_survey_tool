// FEATURE:      Consolidated geographic hotspot report
// SURFACE:      node --test src/features/report-player/campus-hotspot-view.test.mjs
// WHY TOGETHER: Lane copy, values, and lane-specific run counts form one view contract.
// STATE:        One synthetic shared grid bin
// RULES:        Held, lag, and accuracy evidence retain their own units and confidence counts.
// PROVENANCE:   Campus-level consolidated report

import assert from "node:assert/strict";
import test from "node:test";

import { renderCampusHotspotTables } from "./campus-hotspot-view.mjs";

test("hotspot tables rank held, lag, and thresholded error separately", () => {
  const html = renderCampusHotspotTables({
    floors: [{ z: 1, name: "First" }],
    bins: [{
      z: 1, lng: 170.5, lat: -45.8,
      heldSeconds: 12, heldRunCount: 2,
      medianLagBehindM: 8, lagRunCount: 3, lagSampleCount: 4,
      medianErrorM: 6, accuracyRunCount: 1, fixCount: 5,
    }],
  });
  assert.match(html, /Raw Cisco positions held while walking/);
  assert.match(html, /12\.0 s/);
  assert.match(html, /8\.0 m · 4 samples/);
  assert.match(html, /6\.0 m · 5 fixes/);
  assert.match(html, /Only errors beyond the selected threshold/);
});
