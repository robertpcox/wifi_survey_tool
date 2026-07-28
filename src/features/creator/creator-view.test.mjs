import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorView } from "./creator-view.mjs";

function makeDocument() {
  const ids = [
    "addPoiId", "collectionTag", "loadRouteBtn", "routeFile", "routeInfo",
    "routeName", "savedRoutes", "statusText", "stopList", "targetChoice",
    "targetChoiceCopy", "targetOutdoorsOption", "targetPoiOption",
    "targetPoiSummary", "targetPointSummary", "targetPointTitle", "wpSpacing",
  ];
  const elements = Object.fromEntries(ids.map(id => [
    id,
    {
      disabled: false,
      hidden: true,
      innerHTML: "",
      style: {},
      textContent: "",
      value: "",
    },
  ]));
  const details = { open: true };
  return {
    defaultView: { matchMedia: query => ({ matches: query.includes("700px") }) },
    details,
    elements,
    getElementById: id => elements[id],
    querySelector: selector => selector === "details.config" ? details : null,
  };
}

test("createCreatorView renders and forwards the preserved Creator UI", () => {
  const documentRef = makeDocument();
  const drawn = { route: [], stops: [], waypoints: [], resizes: 0 };
  const mapAdapter = {
    drawRoute: value => drawn.route.push(value),
    drawStops: value => drawn.stops.push(value),
    drawWaypoints: value => drawn.waypoints.push(value),
    resizeMapSoon: () => drawn.resizes++,
  };
  const view = createCreatorView(documentRef, mapAdapter);
  view.renderStops([]);
  assert.equal(
    documentRef.elements.stopList.innerHTML,
    '<div class="hint">No stops yet.</div>',
  );
  const point = {
    label: '<Hall "A">',
    lat: -36.85,
    lng: 174.76,
    poiName: null,
    targetType: "point",
    z: 2,
  };
  const poi = {
    label: "Lab & One",
    lat: -36.851,
    lng: 174.761,
    poiId: 42,
    poiName: "Lab & One",
    targetType: "poi",
    z: 2,
  };
  view.renderStops([point, poi]);
  const html = documentRef.elements.stopList.innerHTML;
  assert.match(html, /&lt;Hall &quot;A&quot;&gt;/);
  assert.match(html, /POI centre/);
  assert.match(html, /moveStop\(1,-1\)/);
  view.showTargetChoice(point, poi);
  assert.equal(documentRef.elements.targetChoice.hidden, false);
  assert.match(documentRef.elements.targetChoiceCopy.textContent, /Lab & One/);
  assert.match(documentRef.elements.targetPoiSummary.textContent, /POI 42/);
  assert.equal(documentRef.elements.targetOutdoorsOption.hidden, true);
  view.showLocationChoice(point);
  assert.equal(documentRef.elements.targetPoiOption.hidden, true);
  assert.equal(documentRef.elements.targetOutdoorsOption.hidden, false);
  assert.match(documentRef.elements.targetChoiceCopy.textContent, /Mark it as outdoors/);
  view.closeTargetChoice();
  assert.equal(documentRef.elements.targetChoice.hidden, true);
  view.refreshSavedRoutes(
    [{ floor: "L&0", name: "<Server>" }],
    { Zulu: {}, "Alpha<script>": {} },
    "local:Zulu",
  );
  const options = documentRef.elements.savedRoutes.innerHTML;
  assert.match(options, /&lt;Server&gt; · L&amp;0/);
  assert.ok(options.indexOf("Alpha&lt;script&gt;") < options.indexOf("Zulu"));
  assert.equal(documentRef.elements.savedRoutes.value, "local:Zulu");
  documentRef.elements.collectionTag.value = " private ";
  documentRef.elements.routeName.value = " Route ";
  documentRef.elements.savedRoutes.value = "server:0";
  documentRef.elements.wpSpacing.value = "15";
  assert.equal(view.collectionTag(), "private");
  assert.equal(view.routeName(), "Route");
  assert.equal(view.selectedRoute(), "server:0");
  assert.equal(view.spacing(), 15);
  assert.equal(view.importInput(), documentRef.elements.routeFile);
  assert.equal(view.stopInput(), documentRef.elements.addPoiId);
  view.setRouteInfo("two legs");
  view.setRouteName("Loaded");
  view.setRouteLoadBusy(true);
  assert.equal(documentRef.elements.routeInfo.textContent, "two legs");
  assert.equal(documentRef.elements.routeName.value, "Loaded");
  assert.equal(documentRef.elements.loadRouteBtn.textContent, "Loading…");
  view.setRouteLoadBusy(false);
  assert.equal(documentRef.elements.loadRouteBtn.textContent, "Load");
  view.setStatus("err", "broken");
  assert.equal(documentRef.elements.statusText.textContent, "broken");
  assert.equal(documentRef.elements.statusText.style.color, "#d92d20");
  view.drawRoute([1]);
  view.drawStops([2]);
  view.drawWaypoints([3]);
  assert.deepEqual(drawn.route, [[1]]);
  assert.deepEqual(drawn.stops, [[2]]);
  assert.deepEqual(drawn.waypoints, [[3]]);
  view.collapseMobileConfig();
  assert.equal(documentRef.details.open, false);
  assert.equal(drawn.resizes, 1);
});
