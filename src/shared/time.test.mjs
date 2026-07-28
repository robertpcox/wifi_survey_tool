import assert from "node:assert/strict";
import test from "node:test";

import { sleep } from "./time.mjs";

test("sleep resolves through setTimeout with the requested delay", async () => {
  const realSetTimeout = globalThis.setTimeout;
  let scheduledDelay;
  let release;
  globalThis.setTimeout = (callback, delay) => {
    scheduledDelay = delay;
    release = callback;
    return 1;
  };

  try {
    let settled = false;
    const waiting = sleep(125).then(() => {
      settled = true;
    });
    await Promise.resolve();
    assert.equal(scheduledDelay, 125);
    assert.equal(settled, false);
    release();
    await waiting;
    assert.equal(settled, true);
  } finally {
    globalThis.setTimeout = realSetTimeout;
  }
});
