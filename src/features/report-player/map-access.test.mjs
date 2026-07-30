// FEATURE:      Report Player public-first map access
// SURFACE:      node --test src/features/report-player/map-access.test.mjs
// WHY TOGETHER: Hidden prompt, typed retry, and prompt-free fallback prove one access boundary.
// STATE:        Fake access controls and memory-only credential store
// RULES:        Metadata hints never reveal the prompt; only a proved denial may reveal it.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { bindMapAccess, renderMapAccess } from "./map-access.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("access markup stays hidden despite its metadata hint", () => {
  const html = renderMapAccess(result);
  assert.match(html, /data-map-access-panel[^>]*data-access-hint="true" hidden/);
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
  const binding = bindMapAccess({
    root: fixture.root,
    credentials,
    surface: {
      retryAccess: async value => {
        retries.push(value);
        return { status: "ready" };
      },
    },
  });
  fixture.input.value = "typed-at-runtime";
  await binding.retry();
  assert.deepEqual(retries, ["typed-at-runtime"]);
  assert.equal(credentials.read("mapAccess"), "typed-at-runtime");
  assert.equal(fixture.input.value, "");
  assert.equal(fixture.panel.hidden, true);
  assert.equal(fixture.toggleButton.attributes["aria-expanded"], "false");
  assert.equal(fixture.toggleButton.focused, 1);
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
  const input = { value: "" };
  const status = { textContent: "", innerHTML: "" };
  const save = listenerNode();
  const clear = listenerNode();
  const toggleButton = listenerNode();
  const nodes = new Map([
    ["[data-map-access-panel]", panel],
    ["[data-map-access]", input],
    ["[data-map-access-status]", status],
    ["[data-save-access]", save],
    ["[data-clear-access]", clear],
    ["[data-toggle-map-access]", toggleButton],
  ]);
  return {
    panel,
    input,
    status,
    toggleButton,
    root: { querySelector: key => nodes.get(key) },
  };
}

function listenerNode() {
  return {
    attributes: {},
    hidden: false,
    focused: 0,
    addEventListener(name, listener) { this[name] = listener; },
    focus() { this.focused += 1; },
    setAttribute(name, value) { this.attributes[name] = value; },
  };
}
