// FEATURE:      Report map rendering feedback
// SURFACE:      node --test src/features/report-player/map-rendering-status.test.mjs
// WHY TOGETHER: Paint timing, live text, and overlap safety prove one busy-state contract.
// STATE:        Controlled animation frames and fake map elements
// RULES:        Completing old work cannot hide or relabel newer work.
// PROVENANCE:   Consolidated report rendering feedback

import assert from "node:assert/strict";
import test from "node:test";

import { createMapRenderingStatus } from "./map-rendering-status.mjs";

test("overlapping renders stay busy until the newest token completes", async () => {
  const frames = [];
  const attributes = new Map();
  const element = { hidden: true, textContent: "" };
  const status = createMapRenderingStatus({
    element,
    mapElement: {
      setAttribute: (key, value) => attributes.set(key, value),
      removeAttribute: key => attributes.delete(key),
    },
    requestAnimationFrameRef: callback => frames.push(callback),
  });
  const older = status.begin("Loading runs…");
  const newer = status.begin("Resolving rooms…");
  const olderDone = status.complete(older);
  assert.equal(element.hidden, false);
  assert.equal(element.textContent, "Resolving rooms…");
  assert.equal(attributes.get("aria-busy"), "true");
  await crossPaint(frames);
  await olderDone;
  assert.equal(element.hidden, false);
  assert.equal(element.textContent, "Resolving rooms…");
  const newerDone = status.complete(newer);
  await crossPaint(frames);
  await newerDone;
  assert.equal(element.hidden, true);
  assert.equal(attributes.has("aria-busy"), false);
});

test("run paints before work and once more before releasing the overlay", async () => {
  const frames = [];
  const events = [];
  const status = createMapRenderingStatus({
    element: { hidden: true, textContent: "" },
    mapElement: null,
    requestAnimationFrameRef: callback => frames.push(callback),
  });
  const work = status.run("Rendering consolidated map…", async () => {
    events.push("work");
    return 7;
  });
  assert.deepEqual(events, []);
  await crossPaint(frames);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(events, ["work"]);
  await new Promise(resolve => setImmediate(resolve));
  await crossPaint(frames);
  assert.equal(await work, 7);
  assert.equal(status.busy, false);
});

async function crossPaint(frames) {
  for (let count = 0; count < 2; count += 1) {
    if (!frames.length) await new Promise(resolve => setImmediate(resolve));
    const frame = frames.shift();
    assert.equal(typeof frame, "function");
    frame();
    await Promise.resolve();
  }
}
