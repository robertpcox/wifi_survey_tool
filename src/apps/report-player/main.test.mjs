// FEATURE:      Merged Report Player app
// SURFACE:      node --test src/apps/report-player/main.test.mjs
// WHY TOGETHER: App composition assertions prove selection owns one feature and map lifecycle.
// STATE:        Minimal fake load-panel root
// RULES:        Missing IDs expose local upload without manifest or map work.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { bootReportPlayer } from "./main.mjs";

test("Report Player app boots to local fallback without selected manifest IDs", async () => {
  const upload = { addEventListener(name, listener) { this[name] = listener; } };
  const status = { textContent: "" };
  const root = {
    innerHTML: "",
    querySelector(selector) {
      if (selector === "[data-result-upload]") return upload;
      if (selector === "[data-report-status]") return status;
      return null;
    },
  };
  let mapCreations = 0;
  const session = await bootReportPlayer({
    documentRef: { querySelector: () => root },
    locationRef: { href: "https://survey.test/report-player/" },
    manifestSource: { customer: async () => assert.fail("must not load") },
    createMap: () => { mapCreations += 1; },
  });
  assert.equal(session.store, null);
  assert.equal(mapCreations, 0);
  assert.match(root.innerHTML, /Local v3 result/);
  assert.equal(typeof upload.change, "function");
});

test("dashboard access is seeded before mount without entering URL or markup", async () => {
  const access = ["dashboard", "runtime", "access"].join("-");
  const credentials = memoryCredentials();
  const root = loadPanelRoot(() => {
    assert.equal(credentials.read("mapAccess"), access);
  });
  const locationRef = {
    href: "https://survey.test/report-player/?customer_id=customer-a",
  };
  const session = await bootReportPlayer({
    credentials,
    documentRef: { querySelector: () => root },
    locationRef,
    windowRef: handoffWindow(access),
    manifestSource: { customer: async () => assert.fail("must not load") },
  });
  assert.equal(session.store, null);
  assert.equal(credentials.read("mapAccess"), access);
  assert.doesNotMatch(locationRef.href, new RegExp(access));
  assert.doesNotMatch(root.innerHTML, new RegExp(access));
});

function loadPanelRoot(onQuery = () => {}) {
  const upload = { addEventListener(name, listener) { this[name] = listener; } };
  const status = { textContent: "" };
  return {
    innerHTML: "",
    querySelector(selector) {
      onQuery();
      if (selector === "[data-result-upload]") return upload;
      if (selector === "[data-report-status]") return status;
      return null;
    },
  };
}

function memoryCredentials() {
  const values = new Map();
  return {
    set: (name, value) => values.set(name, value),
    read: name => values.get(name) ?? null,
  };
}

function handoffWindow(access) {
  let listener;
  const windowRef = {
    location: { origin: "https://survey.test" },
    addEventListener: (_name, callback) => { listener = callback; },
    removeEventListener: () => { listener = null; },
    setTimeout,
    clearTimeout,
  };
  const opener = {
    closed: false,
    postMessage(request, origin) {
      queueMicrotask(() => listener?.({
        origin,
        source: opener,
        data: {
          type: "wifi-survey-map-access-response",
          version: 1,
          nonce: request.nonce,
          access,
        },
      }));
    },
  };
  windowRef.opener = opener;
  return windowRef;
}
