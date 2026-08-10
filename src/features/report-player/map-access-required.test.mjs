// FEATURE:      Consolidated report private-area access gate
// SURFACE:      node --test src/features/report-player/map-access-required.test.mjs
// WHY TOGETHER: Required markup, token success, decline, and stale public outcomes share one gate.
// STATE:        Fake access controls and in-memory credentials
// RULES:        Public launch never authorizes private room/corridor polygon scoring.
// PROVENANCE:   Campus overview area-resolution access

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { bindMapAccess, renderMapAccess } from "./map-access.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("required overview gate is visible and labels unscored area fallback", () => {
  const html = renderMapAccess(result, { requirePrivateAccess: true });
  assert.match(html, /data-access-required="true"/);
  assert.doesNotMatch(html, /data-access-required="true"[^>]*hidden/);
  assert.match(html, /private level polygons/i);
  assert.match(html, /Continue without area resolution/);
});

test("only a successful private retry unlocks areas and stale public launch is ignored", async () => {
  const fixture = fakeAccessRoot();
  let enabled = 0;
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    requirePrivateAccess: true,
    surface: { retryAccess: async () => ({ status: "ready" }) },
    onReady: () => { enabled += 1; },
  });
  binding.handleLaunch({ status: "ready" });
  assert.equal(binding.accessReady, false);
  assert.equal(fixture.panel.hidden, false);
  assert.match(fixture.status.textContent, /Public map active/);
  fixture.input.value = "private-token";
  await binding.retry();
  assert.equal(binding.accessReady, true);
  assert.equal(enabled, 1);
  assert.equal(fixture.panel.hidden, true);
  binding.handleLaunch({ status: "access-denied" });
  assert.equal(fixture.panel.hidden, true, "late public outcome cannot reopen the gate");
  assert.equal(enabled, 1);
});

test("explicit area fallback marks unavailable without discarding the public map", () => {
  const fixture = fakeAccessRoot();
  let unavailable = 0;
  let discarded = 0;
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    requirePrivateAccess: true,
    surface: { declineAccess: () => { discarded += 1; } },
    onDecline: () => { unavailable += 1; },
  });
  binding.decline();
  assert.equal(unavailable, 1);
  assert.equal(discarded, 0);
  assert.equal(binding.declined, true);
  assert.equal(fixture.panel.hidden, true);
});

function memoryCredentials() {
  const values = new Map();
  return {
    clear: key => values.delete(key),
    has: key => Boolean(values.get(key)),
    read: key => values.get(key),
    set: (key, value) => value ? values.set(key, value) : values.delete(key),
  };
}

function fakeAccessRoot() {
  const panel = { hidden: true };
  const input = { value: "", focus() {} };
  const status = { textContent: "", innerHTML: "" };
  const nodes = new Map([
    ["[data-map-access-panel]", panel], ["[data-map-access]", input],
    ["[data-map-access-status]", status], ["[data-save-access]", node()],
    ["[data-clear-access]", node()], ["[data-toggle-map-access]", node()],
  ]);
  return { panel, input, status, root: { querySelector: key => nodes.get(key) } };
}

function node() {
  return {
    addEventListener(name, listener) { this[name] = listener; },
    setAttribute() {}, focus() {}, hidden: false,
  };
}
