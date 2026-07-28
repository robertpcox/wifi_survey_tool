import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createMazeMapCloudSource,
  positionUrl,
} from "./mazemap-cloud-v3.mjs";

const payload = JSON.parse(await readFile(new URL(
  "../../../data/positioning/ndh-outpatient-level-00.mazemap-cloud.response.json",
  import.meta.url,
)));

function sourceFor(response) {
  const times = [1000, 1137];
  return createMazeMapCloudSource({
    fetchImpl: async () => response,
    nowMs: () => times.shift(),
    setTimer: () => 9,
    clearTimer() {},
  });
}

test("normal Cloud response preserves raw data and normalizes timing", async () => {
  const source = sourceFor({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  });
  const sample = await source.poll(request());
  assert.equal(sample.sourceId, "mazemap-cloud");
  assert.equal(sample.roundTripMs, 137);
  assert.equal(sample.httpStatus, 200);
  assert.equal(sample.success, true);
  assert.deepEqual(sample.raw, payload);
  assert.equal(sample.raw.locationName.endsWith("OB Level 00"), true);
  assert.equal(sample.raw.x, 42);
  assert.equal(sample.raw.y, 42);
  assert.deepEqual(sample.normalized, {
    lat: -45.87247433704778,
    lng: 170.50855054713742,
    z: 1,
    fixTime: "2026-07-28T06:12:45.000Z",
    confidence: 4.8768,
  });
});

test("HTTP and malformed responses retain raw evidence and plain errors", async () => {
  const failed = await sourceFor({
    ok: false,
    status: 500,
    text: async () => JSON.stringify({ reason: "upstream" }),
  }).poll(request());
  assert.deepEqual(failed.raw, { reason: "upstream" });
  assert.equal(failed.error, "Positioning proxy returned HTTP 500");
  assert.equal(failed.success, false);

  const malformed = await sourceFor({
    ok: true,
    status: 200,
    text: async () => "<not-json>",
  }).poll(request());
  assert.equal(malformed.raw, "<not-json>");
  assert.equal(malformed.error, "Positioning proxy returned malformed JSON");
});

test("timeout records zero HTTP status, timing, and a null raw body", async () => {
  const times = [1000, 1300];
  let abort;
  const source = createMazeMapCloudSource({
    fetchImpl: async (_url, options) => {
      abort();
      assert.equal(options.signal.aborted, true);
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    },
    nowMs: () => times.shift(),
    setTimer: callback => {
      abort = callback;
      return 4;
    },
    clearTimer() {},
    timeoutMs: 250,
  });
  const sample = await source.poll(request());
  assert.equal(sample.httpStatus, 0);
  assert.equal(sample.roundTripMs, 300);
  assert.equal(sample.raw, null);
  assert.match(sample.error, /timed out after 250 ms/);
});

test("proxy URL uses the definition base without duplicating its path", () => {
  assert.equal(
    positionUrl(request()),
    "/mm-positioning-proxy/position?configId=1185&clientIp=192.0.2.8",
  );
  assert.throws(
    () => positionUrl({ ...request(), proxyBase: " " }),
    /proxy base is required/,
  );
});

function request() {
  return {
    proxyBase: "/mm-positioning-proxy/",
    configId: "1185",
    clientIp: "192.0.2.8",
    appId: "in-memory-id",
    appKey: ["in", "memory", "key"].join("-"),
  };
}
