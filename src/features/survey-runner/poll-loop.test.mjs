import assert from "node:assert/strict";
import test from "node:test";

import { createRunnerPollLoop } from "./poll-loop.mjs";

test("capture polling uses the definition cadence with no Runner fallback", async () => {
  const calls = [];
  const timers = [];
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
    setTimer: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimer: id => calls.push(["clear", id]),
  });
  assert.equal((await loop.sampleOnce("preflight")).id, "poll-1");
  loop.start();
  await Promise.resolve();
  assert.equal(timers[0].delay, 2345);
  assert.deepEqual(calls.slice(0, 4), [
    ["poll", { clientIp: "192.0.2.8" }],
    ["preflight", "poll-1"],
    ["poll", { clientIp: "192.0.2.8" }],
    ["capture", "poll-3"],
  ]);
  loop.stop();
  assert.equal(loop.active, false);
  await timers[0].callback();
  assert.equal(timers.length, 1);
  assert.throws(
    () => createRunnerPollLoop({ source, intervalMs: 0 }),
    /polling interval is required/,
  );
});
