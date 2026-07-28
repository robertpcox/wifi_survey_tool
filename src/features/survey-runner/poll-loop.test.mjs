import assert from "node:assert/strict";
import test from "node:test";

import { createRunnerPollLoop } from "./poll-loop.mjs";

test("capture polling keeps request starts on the definition cadence", async () => {
  const calls = [];
  const timers = [];
  const times = [10_000, 10_950, 12_345, 14_900];
  const source = {
    id: "mazemap-cloud",
    async poll(request) {
      calls.push(["poll", request]);
      return { id: `poll-${calls.length}` };
    },
  };
  const loop = createRunnerPollLoop({
    source,
    intervalMs: 2345,
    request: () => ({ clientIp: "192.0.2.8" }),
    onSample: (sample, context) => calls.push([context, sample.id]),
    nowMs: () => times.shift(),
    setTimer: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimer: id => calls.push(["clear", id]),
  });
  assert.equal((await loop.sampleOnce("preflight")).id, "poll-1");
  loop.start();
  await Promise.resolve();
  assert.equal(timers[0].delay, 1395);
  assert.deepEqual(calls.slice(0, 4), [
    ["poll", { clientIp: "192.0.2.8" }],
    ["preflight", "poll-1"],
    ["poll", { clientIp: "192.0.2.8" }],
    ["capture", "poll-3"],
  ]);
  timers[0].callback();
  await Promise.resolve();
  assert.equal(timers[1].delay, 0);

  loop.stop();
  assert.equal(loop.active, false);
  const pollCount = calls.filter(([kind]) => kind === "poll").length;
  timers[1].callback();
  await Promise.resolve();
  assert.equal(calls.filter(([kind]) => kind === "poll").length, pollCount);
  assert.equal(timers.length, 2);
  assert.throws(
    () => createRunnerPollLoop({ source, intervalMs: 0 }),
    /polling interval is required/,
  );
});

test("stop discards an in-flight response and a restart uses a new generation", async () => {
  let resolvePending;
  let pollCount = 0;
  const samples = [];
  const timers = [];
  const times = [0, 100, 200];
  const source = {
    id: "mazemap-cloud",
    async poll() {
      pollCount++;
      if (pollCount === 1) {
        return new Promise(resolve => {
          resolvePending = resolve;
        });
      }
      return { id: "fresh" };
    },
  };
  const loop = createRunnerPollLoop({
    source,
    intervalMs: 2345,
    request: () => ({}),
    onSample: sample => samples.push(sample.id),
    nowMs: () => times.shift(),
    setTimer: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimer: () => {},
  });

  loop.start();
  loop.stop();
  resolvePending({ id: "stale" });
  await Promise.resolve();
  assert.deepEqual(samples, []);
  assert.deepEqual(timers, []);

  loop.start();
  await Promise.resolve();
  assert.deepEqual(samples, ["fresh"]);
  assert.equal(timers[0].delay, 2245);
});
