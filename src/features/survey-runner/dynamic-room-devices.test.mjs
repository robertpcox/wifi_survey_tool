// FEATURE:      Dynamic room multi-device entry option tests
// SURFACE:      Extra-device parsing, dwell selection, and entry issue coverage
// WHY TOGETHER: One entry form must yield devices, dwell, and validation together.
// STATE:        None
// RULES:        Extra devices stay optional and never alter the primary device.
// PROVENANCE:   Dynamic room multi-device capture request

import assert from "node:assert/strict";
import test from "node:test";

import {
  deviceLabelSlug,
  dynamicEntryIssues,
  runnerDynamicDwellSeconds,
  runnerDynamicMarkSpacingM,
  runnerExtraDevices,
} from "./dynamic-room-devices.mjs";

test("extra devices parse only complete label and client IP pairs", () => {
  assert.deepEqual(runnerExtraDevices({}), []);
  assert.deepEqual(runnerExtraDevices({
    extraDevice1Label: " iPhone B ",
    extraDevice1Ip: " 192.0.2.9 ",
    extraDevice2Label: "iPhone C",
    extraDevice2Ip: "",
  }), [{ label: "iPhone B", clientIp: "192.0.2.9", slug: "iphone-b" }]);
  assert.deepEqual(runnerExtraDevices({
    extraDevice2Label: "Ward Cart 2",
    extraDevice2Ip: "192.0.2.10",
  }), [{ label: "Ward Cart 2", clientIp: "192.0.2.10", slug: "ward-cart-2" }]);
});

test("device label slugs stay collision-safe filename fragments", () => {
  assert.equal(deviceLabelSlug("iPhone B"), "iphone-b");
  assert.equal(deviceLabelSlug("  Trolley #7! "), "trolley-7");
  assert.equal(deviceLabelSlug("???", 1), "device-3");
  assert.equal(deviceLabelSlug("", 0), "device-2");
});

test("dynamic dwell defaults to 45 seconds and accepts only offered choices", () => {
  assert.equal(runnerDynamicDwellSeconds({}), 45);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: "" }), 45);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: "5" }), 5);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: "15" }), 15);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: "30" }), 30);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: 45 }), 45);
  assert.equal(runnerDynamicDwellSeconds({ dynamicDwellSeconds: "90" }), 45);
});

test("mark spacing defaults to 5 m, honours off, and rejects odd values", () => {
  assert.equal(runnerDynamicMarkSpacingM({}), 5);
  assert.equal(runnerDynamicMarkSpacingM({ dynamicMarkSpacingM: "" }), 5);
  assert.equal(runnerDynamicMarkSpacingM({ dynamicMarkSpacingM: "0" }), 0);
  assert.equal(runnerDynamicMarkSpacingM({ dynamicMarkSpacingM: "10" }), 10);
  assert.equal(runnerDynamicMarkSpacingM({ dynamicMarkSpacingM: "7" }), 5);
  assert.deepEqual(dynamicEntryIssues({ dynamicMarkSpacingM: "10" }), []);
  assert.deepEqual(
    dynamicEntryIssues({ dynamicMarkSpacingM: "7" }),
    ["dynamicMarkSpacingM is unsupported"],
  );
});

test("entry issues flag half-filled devices, bad dwell, and bad proxy base", () => {
  assert.deepEqual(dynamicEntryIssues({}), []);
  assert.deepEqual(dynamicEntryIssues({
    dynamicDwellSeconds: "45",
    proxyBase: "http://192.168.1.10:8788/mm-positioning-proxy",
    extraDevice1Label: "iPhone B",
    extraDevice1Ip: "192.0.2.9",
  }), []);
  assert.deepEqual(dynamicEntryIssues({ proxyBase: "/mm-positioning-proxy" }), []);
  assert.deepEqual(dynamicEntryIssues({
    dynamicDwellSeconds: "7",
    proxyBase: "192.168.1.10:8788",
    extraDevice1Label: "iPhone B",
    extraDevice2Ip: "192.0.2.10",
  }), [
    "dynamicDwellSeconds is unsupported",
    "proxyBase must be an absolute URL or path",
    "extraDevice1Ip is required",
    "extraDevice2Label is required",
  ]);
});
