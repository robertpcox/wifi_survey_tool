// FEATURE:      Report Player preloaded map access
// SURFACE:      node --test src/features/report-player/map-access-preloaded.test.mjs
// WHY TOGETHER: Private-first startup, recovery, and duplicate suppression share one lifecycle.
// STATE:        Preseeded memory credentials and deferred fake map launches
// RULES:        Dashboard access stays concealed only after its own successful first launch.
// PROVENANCE:   Customer dashboard memory-only map access

import assert from "node:assert/strict";
import test from "node:test";

import { fakeAccessRoot, memoryCredentials } from "./fixtures/map-access-fixture.mjs";
import { bindMapAccess } from "./map-access.mjs";

test("dashboard access launches an optional report privately first and stays concealed", async () => {
  const fixture = fakeAccessRoot();
  const credentials = memoryCredentials("dashboard-access");
  const privateTokens = [];
  let publicStarts = 0;
  const binding = bindMapAccess({
    root: fixture.root, credentials, dashboardSupplied: true,
    surface: {
      start: async () => { publicStarts += 1; return { status: "ready" }; },
      retryAccess: async token => { privateTokens.push(token); return { status: "ready" }; },
    },
  });
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, true);
  assert.equal((await binding.start()).status, "ready");
  assert.deepEqual(privateTokens, ["dashboard-access"]);
  assert.equal(publicStarts, 0);
  assert.equal(binding.accessReady, true);
  assert.equal(credentials.read("mapAccess"), "dashboard-access");
  assert.equal(fixture.input.value, "");
  assert.equal(fixture.input.focused, 0);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, true);
});

test("an optional report without preloaded access remains public-first", async () => {
  const fixture = fakeAccessRoot();
  let publicStarts = 0;
  let privateStarts = 0;
  const binding = bindMapAccess({
    root: fixture.root, credentials: memoryCredentials(),
    surface: {
      start: async () => { publicStarts += 1; return { status: "ready" }; },
      retryAccess: async () => { privateStarts += 1; return { status: "ready" }; },
    },
  });
  assert.equal((await binding.start()).status, "ready");
  assert.equal(publicStarts, 1);
  assert.equal(privateStarts, 0);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, false);
});

test("a failed dashboard credential clears and reveals a focused correction prompt", async () => {
  const fixture = fakeAccessRoot();
  const credentials = memoryCredentials("expired-access");
  const privateTokens = [];
  let publicStarts = 0;
  const binding = bindMapAccess({
    root: fixture.root, credentials, dashboardSupplied: true,
    requirePrivateAccess: true,
    surface: {
      start: async () => { publicStarts += 1; return { status: "ready" }; },
      retryAccess: async token => {
        privateTokens.push(token);
        return privateTokens.length === 1
          ? { status: "fallback", error: new Error("access expired") }
          : { status: "ready" };
      },
    },
  });
  let settled = false;
  const ready = binding.start().then(outcome => { settled = true; return outcome; });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(privateTokens, ["expired-access"]);
  assert.equal(publicStarts, 0);
  assert.equal(credentials.read("mapAccess"), undefined);
  assert.equal(binding.accessReady, false);
  assert.equal(settled, false);
  assert.equal(fixture.panel.hidden, false);
  assert.equal(fixture.toggleButton.hidden, false);
  assert.equal(fixture.input.focused, 1);
  assert.match(fixture.status.innerHTML, /access expired/);
  fixture.input.value = "corrected-access";
  await binding.retry();
  assert.equal((await ready).status, "ready");
  assert.deepEqual(privateTokens, ["expired-access", "corrected-access"]);
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, false);
});

test("duplicate submissions share one pending private-map attempt", async () => {
  const fixture = fakeAccessRoot();
  const credentials = memoryCredentials();
  const privateTokens = [];
  let enableCount = 0;
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const binding = bindMapAccess({
    root: fixture.root, credentials,
    surface: { retryAccess: async token => {
      privateTokens.push(token);
      await gate;
      return { status: "ready" };
    } },
    onReady: () => { enableCount += 1; },
  });
  fixture.input.value = "first-access";
  const first = binding.retry();
  assert.equal(fixture.saveButton.disabled, true);
  assert.equal(fixture.clearButton.disabled, true);
  fixture.input.value = "ignored-duplicate";
  const duplicate = binding.retry();
  assert.deepEqual(privateTokens, ["first-access"]);
  release();
  await Promise.all([first, duplicate]);
  assert.equal(credentials.read("mapAccess"), "first-access");
  assert.equal(enableCount, 1);
  assert.equal(fixture.saveButton.disabled, false);
  assert.equal(fixture.clearButton.disabled, false);
});
