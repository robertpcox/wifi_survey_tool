// FEATURE:      Consolidated report private-area access gate
// SURFACE:      node --test src/features/report-player/map-access-required.test.mjs
// WHY TOGETHER: Required markup, token success, decline, and stale public outcomes share one gate.
// STATE:        Fake access controls and in-memory credentials
// RULES:        Public launch never authorizes private room/corridor polygon scoring.
// PROVENANCE:   Campus overview area-resolution access

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fakeAccessRoot, memoryCredentials } from "./fixtures/map-access-fixture.mjs";
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

test("required access blocks the first map launch until a private token succeeds", async () => {
  const fixture = fakeAccessRoot();
  let enabled = 0;
  let publicStarts = 0;
  const privateTokens = [];
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    requirePrivateAccess: true,
    surface: {
      start: async () => { publicStarts += 1; return { status: "ready" }; },
      retryAccess: async token => {
        privateTokens.push(token);
        return { status: "ready" };
      },
    },
    onReady: () => { enabled += 1; },
  });
  const ready = binding.start();
  await Promise.resolve();
  assert.equal(binding.accessReady, false);
  assert.equal(publicStarts, 0);
  assert.equal(fixture.panel.hidden, false);
  assert.match(fixture.status.textContent, /before the campus map/i);
  fixture.input.value = "private-token";
  await binding.retry();
  assert.equal((await ready).status, "ready");
  assert.deepEqual(privateTokens, ["private-token"]);
  assert.equal(publicStarts, 0);
  assert.equal(binding.accessReady, true);
  assert.equal(enabled, 1);
  assert.equal(fixture.panel.hidden, true);
  binding.handleLaunch({ status: "access-denied" });
  assert.equal(fixture.panel.hidden, true, "late public outcome cannot reopen the gate");
  assert.equal(enabled, 1);
});

test("explicit area fallback starts public MazeMap only after the decision", async () => {
  const fixture = fakeAccessRoot();
  let unavailable = 0;
  let discarded = 0;
  let enabled = 0;
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    requirePrivateAccess: true,
    surface: {
      start: async () => { discarded += 1; return { status: "ready" }; },
      retryAccess: async () => ({ status: "ready" }),
      declineAccess: () => { throw new Error("required access must not discard the map"); },
    },
    onReady: () => { enabled += 1; },
    onDecline: () => { unavailable += 1; },
  });
  const ready = binding.start();
  await binding.decline();
  assert.equal((await ready).status, "ready");
  assert.equal(unavailable, 1);
  assert.equal(discarded, 1);
  assert.equal(binding.declined, true);
  assert.equal(fixture.panel.hidden, true);
  fixture.input.value = "corrected-private-token";
  await binding.retry();
  assert.equal(enabled, 1, "a later private retry reruns area resolution");
});

test("room catalogue work starts only after the authenticated map is ready", async () => {
  const fixture = fakeAccessRoot();
  const events = [];
  let releaseMap;
  const mapGate = new Promise(resolve => { releaseMap = resolve; });
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    requirePrivateAccess: true,
    surface: { retryAccess: async token => {
      events.push(`token:${token}`);
      await mapGate;
      events.push("map:ready");
      return { status: "ready" };
    } },
    onReady: () => { events.push("catalogue:start"); },
  });
  const initial = binding.start();
  fixture.input.value = "private-token";
  const retry = binding.retry();
  await Promise.resolve();
  assert.deepEqual(events, ["token:private-token"]);
  releaseMap();
  await retry;
  assert.equal((await initial).status, "ready");
  assert.deepEqual(events, [
    "token:private-token", "map:ready", "catalogue:start",
  ]);
});
