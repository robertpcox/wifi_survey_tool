// FEATURE:      Report direction overlay
// SURFACE:      Node test for report-route-axis.mjs
// WHY TOGETHER: Out-and-back folding assertions prove one canonical corridor axis.
// STATE:        One synthetic out-and-back route model
// RULES:        Return-pass positions fold to first-pass distances; wrong floors stay off-axis.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import assert from "node:assert/strict";
import test from "node:test";

import { buildReportRoute } from "./report-route.mjs";
import { createReportRouteAxis } from "./report-route-axis.mjs";

const route = buildReportRoute({
  legs: [
    {
      id: "leg-out",
      fromStopId: "stop-a1",
      toStopId: "stop-b",
      geometry: [
        { lng: 170.5000, lat: -45.8700, z: 0 },
        { lng: 170.5004, lat: -45.8700, z: 0 },
      ],
    },
    {
      id: "leg-back",
      fromStopId: "stop-b",
      toStopId: "stop-a2",
      geometry: [
        { lng: 170.5004, lat: -45.8700, z: 0 },
        { lng: 170.5000, lat: -45.8700, z: 0 },
      ],
    },
  ],
});
const outboundM = route.legs[0].endDistanceM;

test("return-pass distances fold onto the first pass", () => {
  const axis = createReportRouteAxis(route);
  assert.equal(axis.axisLengthM, route.totalDistanceM);
  const folded = axis.canonicalOfDistance(outboundM * 1.5);
  assert.ok(
    Math.abs(folded - outboundM * 0.5) < 0.01,
    `expected fold to ${outboundM * 0.5}, got ${folded}`,
  );
  const kept = axis.canonicalOfDistance(outboundM * 0.25);
  assert.ok(Math.abs(kept - outboundM * 0.25) < 0.01);
});

test("points fold spatially and respect the floor", () => {
  const axis = createReportRouteAxis(route);
  const near = axis.canonicalAt({ lng: 170.5003, lat: -45.87001, z: 0 });
  const onRoute = axis.canonicalAt(route.pointAt(outboundM * 0.75));
  assert.ok(Math.abs(near - outboundM * 0.75) < 1);
  assert.ok(Math.abs(onRoute - outboundM * 0.75) < 0.01);
  assert.equal(axis.canonicalAt({ lng: 170.5003, lat: -45.8700, z: 4 }), null);
  assert.equal(axis.canonicalAt({ lng: 170.5003, lat: -45.8700 }), null);
});
