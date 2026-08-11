// FEATURE:      Dashboard map access handoff
// SURFACE:      node --test src/features/dashboard/dashboard-map-access.test.mjs
// WHY TOGETHER: Credential entry, native links, child launch, and popup fallback share one form.
// STATE:        Synthetic controls, memory credentials, and report links
// RULES:        Values leave the input immediately and never enter markup or report URLs.
// PROVENANCE:   Customer dashboard report launch

import assert from "node:assert/strict";
import test from "node:test";

import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import {
  bindDashboardMapAccess,
  renderDashboardMapAccess,
} from "./dashboard-map-access.mjs";

test("dashboard access markup is accessible and contains no credential value", () => {
  const html = renderDashboardMapAccess();
  assert.match(html, /<section[^>]+aria-labelledby="map-access-title"/);
  assert.match(html, /type="password"/);
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.doesNotMatch(html, /value=|localStorage|sessionStorage|MAP_TOKEN/);
});

test("save clears the input and both report link types use child handoff", () => {
  const fixture = dashboardFixture();
  const credentials = createMemoryCredentialStore();
  const opened = [];
  bindDashboardMapAccess({
    root: fixture.root, credentials, windowRef: fixture.windowRef,
    sender: { open: href => { opened.push(href); return {}; }, destroy() {} },
  });
  const native = click(fixture.links[0]);
  assert.equal(native.prevented, false, "tokenless links retain native navigation");
  fixture.input.value = "  runtime-access  ";
  fixture.form.submit({ preventDefault() {} });
  assert.equal(fixture.input.value, "");
  assert.equal(credentials.read("mapAccess"), "runtime-access");
  assert.equal(fixture.clear.disabled, false);
  for (const link of fixture.links) assert.equal(click(link).prevented, true);
  assert.deepEqual(opened, fixture.links.map(link => link.href));
  assert.match(fixture.status.textContent, /Opening report/);
  fixture.clear.click();
  assert.equal(credentials.read("mapAccess"), null);
  assert.equal(fixture.clear.disabled, true);
  assert.equal(click(fixture.links[1]).prevented, false);
});

test("blocked child launch falls back to the unchanged report URL in this tab", () => {
  const fixture = dashboardFixture();
  const credentials = createMemoryCredentialStore();
  credentials.set("mapAccess", "runtime-access");
  bindDashboardMapAccess({
    root: fixture.root, credentials, windowRef: fixture.windowRef,
    sender: { open: () => null, destroy() {} },
  });
  assert.equal(click(fixture.links[0]).prevented, true);
  assert.deepEqual(fixture.assigned, [fixture.links[0].href]);
  assert.match(fixture.status.textContent, /Pop-up blocked/);
  assert.doesNotMatch(fixture.assigned[0], /runtime-access/);
});

function dashboardFixture() {
  const form = node();
  const input = { value: "", focused: 0, focus() { this.focused += 1; } };
  const clear = node();
  const status = { textContent: "" };
  const links = [
    link("https://survey.test/report-player/?result_id=run-a"),
    link("https://survey.test/report-player/?campus_id=566&view=overview"),
  ];
  const nodes = new Map([
    ["[data-dashboard-map-access-form]", form],
    ["[data-dashboard-map-access]", input],
    ["[data-clear-dashboard-map-access]", clear],
    ["[data-dashboard-map-access-status]", status],
  ]);
  const assigned = [];
  return {
    assigned, clear, form, input, links, status,
    root: {
      querySelector: selector => nodes.get(selector),
      querySelectorAll: selector => selector === "[data-report-launch]" ? links : [],
    },
    windowRef: { location: { assign: href => assigned.push(href) } },
  };
}

function click(target) {
  const event = {
    button: 0, currentTarget: target, defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
  };
  target.click(event);
  return { prevented: event.defaultPrevented };
}

function link(href) { return { ...node(), href }; }
function node() {
  return {
    disabled: false,
    addEventListener(name, listener) { this[name] = listener; },
    removeEventListener() {},
  };
}
