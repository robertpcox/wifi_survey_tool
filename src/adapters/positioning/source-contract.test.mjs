import test from "node:test";
import assert from "node:assert/strict";

import {
  POSITION_SOURCES,
  V3_POSITION_SOURCES,
  assertPositionSourceAdapter,
  beginPositionSample,
  failPositionSample,
  finishPositionSample,
  normalizePositionOutcome,
} from "./source-contract.mjs";

const SENT = Date.parse("2026-07-27T08:10:20.000Z");
const RECEIVED = SENT + 137;

test("beginPositionSample records the unchanged capture shape", () => {
  assert.deepEqual(POSITION_SOURCES, ["cloud", "lipi"]);
  assert.deepEqual(beginPositionSample(4, "cloud", "poll", SENT), {
    id: 4,
    source: "cloud",
    ctx: "poll",
    tSentMs: SENT,
    isoSent: "2026-07-27T08:10:20.000Z",
    tRecvMs: null,
    isoRecv: null,
    rttMs: null,
    http: null,
    ok: false,
    data: null,
    error: null,
  });
});

test("finishPositionSample preserves JSON and derives response timing", async () => {
  const sample = beginPositionSample(5, "lipi", { waypoint: "A" }, SENT);
  const payload = {
    latitude: -45.872,
    longitude: 170.508,
    zLevel: 2,
    lastSeen: 1770000000000,
    confidenceFactor: 0.81,
    providerExtra: { untouched: true },
  };
  const finished = await finishPositionSample(sample, {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  }, () => RECEIVED);

  assert.equal(finished.http, 200);
  assert.equal(finished.ok, true);
  assert.deepEqual(finished.data, payload);
  assert.equal(finished.tRecvMs, RECEIVED);
  assert.equal(finished.isoRecv, "2026-07-27T08:10:20.137Z");
  assert.equal(finished.rttMs, 137);
  assert.equal(sample.tRecvMs, null);
});

test("malformed and failed samples retain raw/error and timing evidence", async () => {
  const sample = beginPositionSample(6, "cloud", "poll", SENT);
  const malformed = await finishPositionSample(sample, {
    ok: false,
    status: 500,
    text: async () => "<gateway failure>",
  }, RECEIVED);
  assert.deepEqual(malformed.data, { raw: "<gateway failure>" });
  assert.equal(malformed.http, 500);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error, null);
  assert.equal(malformed.rttMs, 137);

  const failed = failPositionSample(sample, new Error("request timed out"), RECEIVED);
  assert.equal(failed.error, "request timed out");
  assert.equal(failed.http, null);
  assert.equal(failed.data, null);
  assert.equal(failed.tRecvMs, RECEIVED);
  assert.equal(failed.isoRecv, "2026-07-27T08:10:20.137Z");
  assert.equal(failed.rttMs, 137);
});

test("v3 contract normalizes Cloud evidence without changing the raw body", () => {
  const raw = {
    latitude: -45.872,
    longitude: 170.508,
    zLevel: 2,
    lastSeen: SENT,
    confidenceFactor: 0.81,
    providerExtra: { untouched: true },
  };
  const result = normalizePositionOutcome({
    id: "poll-1",
    sourceId: "mazemap-cloud",
    sentAt: SENT,
    receivedAt: RECEIVED,
    httpStatus: 200,
    success: true,
    raw,
  });
  assert.deepEqual(V3_POSITION_SOURCES, ["mazemap-cloud"]);
  assert.equal(result.raw, raw);
  assert.deepEqual(result.normalized, {
    lat: -45.872,
    lng: 170.508,
    z: 2,
    fixTime: "2026-07-27T08:10:20.000Z",
    confidence: 0.81,
  });
  assert.equal(result.roundTripMs, 137);
  assert.equal(result.success, true);
});

test("v3 adapter assertion freezes the MazeMap Cloud boundary", () => {
  const adapter = { id: "mazemap-cloud", poll() {} };
  assert.equal(assertPositionSourceAdapter(adapter), adapter);
  assert.throws(
    () => assertPositionSourceAdapter({ id: "unknown", poll() {} }),
    /Unsupported v3 position source/,
  );
  assert.throws(
    () => assertPositionSourceAdapter({ id: "mazemap-cloud" }),
    /must expose poll/,
  );
});
