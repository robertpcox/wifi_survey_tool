import assert from "node:assert/strict";
import test from "node:test";

import { prepareSurveyPage } from "./browser-stubs.mjs";

function pageHarness() {
  const listeners = {};
  const page = {
    evaluateOnNewDocument: async callback => {
      page.installCallback = callback;
    },
    setRequestInterception: async enabled => {
      page.interception = enabled;
    },
    on: (name, callback) => {
      listeners[name] = callback;
    },
  };
  return { listeners, page };
}

function request(url) {
  const calls = [];
  return {
    calls,
    request: {
      url: () => url,
      respond: async options => calls.push(["respond", options]),
      continue: async () => calls.push(["continue"]),
      abort: async reason => calls.push(["abort", reason]),
    },
  };
}

test("prepareSurveyPage installs capture, interception, and error listeners", async () => {
  const { listeners, page } = pageHarness();
  const errors = [];
  await prepareSurveyPage(page, "http://127.0.0.1:8123", errors, []);
  assert.equal(typeof page.installCallback, "function");
  assert.equal(page.interception, true);
  assert.equal(typeof listeners.request, "function");
  listeners.console({ type: () => "error", text: () => "console failure" });
  listeners.pageerror(new Error("page failure"));
  assert.deepEqual(errors, ["console failure", "page failure"]);
});

test("request interception stubs maps and provider and blocks other hosts", async () => {
  const { listeners, page } = pageHarness();
  const requests = [];
  await prepareSurveyPage(
    page,
    "http://127.0.0.1:8123",
    [],
    requests,
  );
  const map = request("https://api.mazemap.com/mazemap.min.js");
  listeners.request(map.request);
  const provider = request(
    "http://127.0.0.1:8123/mm-positioning-proxy/position",
  );
  listeners.request(provider.request);
  const local = request("http://127.0.0.1:8123/main.mjs");
  listeners.request(local.request);
  const blocked = request("https://provider.invalid/live");
  listeners.request(blocked.request);
  await Promise.resolve();
  assert.equal(map.calls[0][0], "respond");
  assert.match(map.calls[0][1].body, /window\.Mazemap/);
  assert.equal(provider.calls[0][0], "respond");
  assert.match(provider.calls[0][1].body, /Stubbed browser fix/);
  assert.deepEqual(local.calls, [["continue"]]);
  assert.deepEqual(blocked.calls, [["abort", "blockedbyclient"]]);
  assert.equal(requests.length, 4);
});
