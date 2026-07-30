// FEATURE:      Dynamic room multi-device polling tests
// SURFACE:      Per-device streams, namespaced poll ids, and combined loop control
// WHY TOGETHER: Extra loops must poll every client IP and follow the primary lifecycle.
// STATE:        Fake source recording each polled request
// RULES:        No extra devices means the primary poll loop is returned untouched.
// PROVENANCE:   Dynamic room multi-device capture request

import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import {
  combineDynamicPollLoops,
  createDynamicDevicePolling,
} from "./dynamic-device-polling.mjs";

const definition = {
  meta: {
    sourceConfig: {
      proxyBase: "/mm-positioning-proxy",
      configId: "1185",
      pollIntervalMs: 2000,
    },
  },
};
const entry = { clientIp: "192.0.2.8", proxyBase: "" };
const devices = [
  { label: "iPhone B", clientIp: "192.0.2.9", slug: "iphone-b" },
  { label: "iPhone C", clientIp: "192.0.2.10", slug: "iphone-c" },
];

function harness() {
  const credentials = createMemoryCredentialStore();
  credentials.set("appId", "id");
  credentials.set("appKey", ["fake", "key"].join("-"));
  const requests = [];
  let sequence = 0;
  const source = {
    id: "mazemap-cloud",
    poll: async request => {
      requests.push(request);
      return { id: `poll-${++sequence}`, sourceId: "mazemap-cloud" };
    },
  };
  return { credentials, requests, source };
}

test("each device polls its own client IP with namespaced sequential ids", async () => {
  const { credentials, requests, source } = harness();
  const polling = createDynamicDevicePolling({
    devices,
    source,
    definition,
    entry,
    credentials,
    setTimer: () => 1,
    clearTimer() {},
  });
  polling.start();
  polling.start();
  await new Promise(resolve => setTimeout(resolve, 0));
  polling.stop();
  assert.deepEqual(
    requests.map(request => request.clientIp).sort(),
    ["192.0.2.10", "192.0.2.9"],
  );
  assert.equal(requests[0].proxyBase, "/mm-positioning-proxy");
  assert.equal(requests[0].configId, "1185");
  assert.deepEqual(polling.streams.map(stream => stream.polls[0].id).sort(), [
    "poll-iphone-b-1",
    "poll-iphone-c-1",
  ]);
  assert.deepEqual(polling.streams.map(stream => stream.label), [
    "iPhone B",
    "iPhone C",
  ]);
});

test("combined loop follows the primary lifecycle and extra loops obey it", () => {
  const { credentials, source } = harness();
  const polling = createDynamicDevicePolling({
    devices: [devices[0]],
    source,
    definition,
    entry,
    credentials,
    setTimer: () => 1,
    clearTimer() {},
  });
  const calls = [];
  const primary = {
    active: false,
    intervalMs: 2000,
    sampleOnce: context => calls.push(["sample", context]),
    start() { this.active = true; calls.push(["start"]); },
    stop() { this.active = false; calls.push(["stop"]); },
  };
  const combined = combineDynamicPollLoops(primary, polling);
  combined.start();
  assert.equal(combined.active, true);
  combined.sampleOnce("preflight");
  combined.stop();
  assert.equal(combined.active, false);
  assert.deepEqual(calls, [["start"], ["sample", "preflight"], ["stop"]]);
  assert.equal(combined.intervalMs, 2000);
});

test("without extra devices the primary loop is returned unchanged", () => {
  const primary = { active: false, start() {}, stop() {} };
  assert.equal(createDynamicDevicePolling({ devices: [] }), null);
  assert.equal(combineDynamicPollLoops(primary, null), primary);
});
