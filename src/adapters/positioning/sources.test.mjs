import test from "node:test";
import assert from "node:assert/strict";

import { fetchPositionSource } from "./sources.mjs";

const config = {
  cloudBase: "https://proxy.example",
  configId: "1185",
  clientIp: "10.0.0.8",
  appId: "app",
  appKey: ["k", "e", "y"].join(""),
  lipiUrl: "https://position.example/direct",
  referrer: "https://survey.example/",
};

function timerHarness() {
  const scheduled = [];
  const cleared = [];
  return {
    scheduled,
    cleared,
    setTimer(callback, timeout) {
      const token = { callback, timeout };
      scheduled.push(token);
      return token;
    },
    clearTimer(token) {
      cleared.push(token);
    },
  };
}

test("source dispatch shares one abort signal and clears its 12s timer", async () => {
  for (const [source, expectedUrl] of [
    ["cloud", "https://proxy.example/mm-positioning-proxy/position?configId=1185&clientIp=10.0.0.8"],
    ["lipi", "https://position.example/direct"],
  ]) {
    const timers = timerHarness();
    let request;
    const response = { source };
    const result = await fetchPositionSource(source, config, {
      ...timers,
      fetchImpl: async (url, options) => {
        request = { url, options };
        return response;
      },
    });

    assert.equal(result, response);
    assert.equal(request.url, expectedUrl);
    assert.equal(request.options.signal.aborted, false);
    assert.equal(timers.scheduled[0].timeout, 12000);
    assert.deepEqual(timers.cleared, timers.scheduled);
  }
});

test("timeout aborts deterministically and rejection still clears the timer", async () => {
  const timers = timerHarness();
  await assert.rejects(
    fetchPositionSource("cloud", config, {
      ...timers,
      timeoutMs: 25,
      fetchImpl: async (_url, options) => {
        timers.scheduled[0].callback();
        assert.equal(options.signal.aborted, true);
        throw new Error("aborted");
      },
    }),
    /aborted/,
  );
  assert.equal(timers.scheduled[0].timeout, 25);
  assert.deepEqual(timers.cleared, timers.scheduled);
});
