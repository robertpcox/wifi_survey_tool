import assert from "node:assert/strict";
import test from "node:test";

import { definitionCreatorTemplate } from "./template.mjs";

test("Creator template exposes launch, three-column authoring, and map choices", () => {
  const html = definitionCreatorTemplate();
  for (const field of [
    "customerId", "campusId", "campusName",
    "positionSourceId", "timezone", "spacingM", "dwellSeconds", "stopZ", "gpsZ",
  ]) {
    assert.match(html, new RegExp(`data-field="${field}"`));
  }
  for (const action of [
    "lock-plan", "add-exact", "add-poi", "capture-gps", "adjust-stop",
    "dismiss-short-warning", "export-definition", "choose-import", "engage-map",
    "cancel-map-choice",
  ]) {
    assert.match(html, new RegExp(`data-action="${action}"`));
  }
  assert.match(html, /id="map" data-floor-map/);
  assert.match(html, /data-route-sidebar/);
  assert.match(html, /data-map-stage/);
  assert.match(html, /data-authoring-panel/);
  assert.match(html, /data-map-choice hidden/);
  assert.match(html, /data-clicked-summary/);
  assert.match(html, /data-poi-summary/);
  assert.match(html, /data-route-mode/);
  assert.match(html, /data-route-preview/);
  assert.match(html, /role="img"[\s\S]*creator-route-preview-title creator-route-preview-desc/);
  assert.match(html, /data-metric="walking"/);
  assert.match(html, /data-engage-access type="password"/);
  assert.match(html, /data-coverage-buildings/);
  assert.match(html, /UUID is generated automatically/);
  assert.match(html, /Runner positioning provider/);
  assert.match(html, /do not configure the authoring map or its routing/);
  assert.match(html, /Optional current-device capture/);
  assert.match(html, /Timezone <select data-field="timezone"/);
  assert.match(html, /value="Australia\/Melbourne" selected/);
  assert.match(html, /value="Pacific\/Auckland"/);
  assert.match(html, /value="UTC"/);
  assert.match(html, /fieldset data-stop-fields hidden disabled/);
  assert.ok(html.indexOf("data-plan-fields") < html.indexOf("<h2>Ordered route</h2>"));
  assert.equal((html.match(/data-plan-fields/g) ?? []).length, 1);
  assert.equal((html.match(/data-action="engage-map"/g) ?? []).length, 1);
  for (const field of ["needsMapAccess", "needsAppId", "needsAppKey", "needsClientIp"]) {
    assert.match(html, new RegExp(`data-field="${field}"[^>]*checked disabled`));
  }
  assert.doesNotMatch(html, /data-field="(?:surveyId|buildings|floors)"/);
  assert.doesNotMatch(html, /data-action="launch-map"/);
  assert.doesNotMatch(html, /Re-engage/);
  assert.doesNotMatch(html, /data-field="(?:device|band)"/i);
});
