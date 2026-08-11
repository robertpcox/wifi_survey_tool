// FEATURE:      Report Player optional public-first map access
// SURFACE:      node --test src/features/report-player/map-access.test.mjs
// WHY TOGETHER: Hidden prompt, typed retry, and prompt-free fallback prove one access boundary.
// STATE:        Fake access controls and memory-only credential store
// RULES:        Metadata hints never reveal the prompt; only a proved denial may reveal it.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { fakeAccessRoot, memoryCredentials } from "./fixtures/map-access-fixture.mjs";
import { bindMapAccess, renderMapAccess } from "./map-access.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("access markup stays hidden despite its metadata hint", () => {
  const html = renderMapAccess(result);
  assert.match(html, /data-map-access-panel[^>]*data-access-hint="true"[^>]* hidden/);
  assert.match(html, /Optional MazeMap access token/);
  assert.match(html, /type="password"/);
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /data-map-access-status role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /value=|localStorage|sessionStorage|MAP_TOKEN/);
});

test("toolbar toggles optional access and keeps expanded state synchronized", () => {
  const fixture = fakeAccessRoot();
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    surface: { retryAccess: async () => ({ status: "ready" }) },
  });
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "false");
  assert.equal(binding.toggle(), true);
  assert.equal(fixture.panel.hidden, false);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "true");
  fixture.toggleButton.click();
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "false");
  binding.open();
  assert.equal(fixture.panel.hidden, false);
  binding.close();
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, false);
});

test("only access denial auto-opens while public and generic outcomes remain prompt-free", () => {
  const fixture = fakeAccessRoot();
  const binding = bindMapAccess({
    root: fixture.root,
    credentials: memoryCredentials(),
    surface: { retryAccess: async () => ({ status: "ready" }) },
  });
  assert.equal(fixture.panel.hidden, true);
  binding.handleLaunch({ status: "access-denied" });
  assert.equal(fixture.panel.hidden, false);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "true");
  assert.match(fixture.status.textContent, /Enter MazeMap access/);
  binding.handleLaunch({
    status: "fallback",
    error: new Error("<script>network unavailable</script>"),
  });
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "false");
  assert.doesNotMatch(fixture.status.innerHTML, /<script>/);
  binding.handleLaunch({ status: "ready" });
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.hidden, false);
});

test("typed access is held in memory, cleared from the input, and retried", async () => {
  const fixture = fakeAccessRoot();
  const credentials = memoryCredentials();
  const retries = [];
  const ready = [];
  const binding = bindMapAccess({
    root: fixture.root,
    credentials,
    surface: {
      retryAccess: async value => {
        retries.push(value);
        return { status: "ready" };
      },
    },
    onReady: outcome => ready.push(outcome.status),
  });
  fixture.input.value = "typed-at-runtime";
  await binding.retry();
  assert.deepEqual(retries, ["typed-at-runtime"]);
  assert.equal(credentials.read("mapAccess"), "typed-at-runtime");
  assert.equal(fixture.input.value, "");
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "false");
  assert.equal(fixture.toggleButton.focused, 1);
  assert.deepEqual(ready, ["ready"]);
});
