// FEATURE:      Browser credential-storage inspection
// SURFACE:      inspectBrowserCredentialStorage(scope, secretNeedles)
// WHY TOGETHER: Empty telemetry and named/supplied credentials define the scanner boundary.
// STATE:        Injected storage-only browser scope
// RULES:        Benign provider telemetry passes; credential fields and secret values fail.
// PROVENANCE:   Scope/test_standard.md secret scanning

import assert from "node:assert/strict";
import test from "node:test";

import { inspectBrowserCredentialStorage } from "./browser_credential_storage.mjs";

test("browser storage scanner permits telemetry and catches app credentials", async () => {
  const clean = await inspectBrowserCredentialStorage(scope({
    "mapbox.eventData": JSON.stringify({ uuid: "public-telemetry-id" }),
  }));
  assert.deepEqual(clean.findings, []);
  assert.deepEqual(clean.databaseNames, []);

  const named = await inspectBrowserCredentialStorage(scope({
    settings: JSON.stringify({ mapAccess: "entered-value" }),
  }));
  assert.match(named.findings[0], /credential field mapAccess/);

  const supplied = await inspectBrowserCredentialStorage(scope({
    opaque: "prefix-entered-secret-suffix",
  }), ["entered-secret"]);
  assert.match(supplied.findings[0], /supplied secret value/);
});

function scope(values) {
  const entries = Object.entries(values);
  return {
    indexedDB: { databases: async () => [] },
    localStorage: storage(entries),
    sessionStorage: storage([]),
  };
}

function storage(entries) {
  return {
    length: entries.length,
    key: index => entries[index]?.[0] ?? null,
    getItem: key => entries.find(entry => entry[0] === key)?.[1] ?? null,
  };
}
