import assert from "node:assert/strict";
import test from "node:test";

import { captureCurrentPosition } from "./geolocation.mjs";

test("capture normalizes reported position data and forwards options", async () => {
  const options = { enableHighAccuracy: true, maximumAge: 0 };
  let receivedOptions;
  const geolocation = {
    getCurrentPosition(success, _failure, requestOptions) {
      receivedOptions = requestOptions;
      success({
        coords: {
          longitude: "170.5001",
          latitude: "-45.8702",
          accuracy: "8.5",
        },
        timestamp: String(Date.parse("2026-07-28T03:04:05.000Z")),
      });
    },
  };

  const capture = await captureCurrentPosition({ geolocation, options });

  assert.deepEqual(capture, {
    lng: 170.5001,
    lat: -45.8702,
    accuracyM: 8.5,
    capturedAt: "2026-07-28T03:04:05.000Z",
  });
  assert.equal(receivedOptions, options);
});

test("capture uses the injected clock when no timestamp is reported", async () => {
  const geolocation = {
    getCurrentPosition(success) {
      success({
        coords: { longitude: 170.5, latitude: -45.87, accuracy: 12 },
      });
    },
  };

  const capture = await captureCurrentPosition({
    geolocation,
    now: () => new Date("2026-07-28T04:00:00.000Z"),
  });

  assert.equal(capture.capturedAt, "2026-07-28T04:00:00.000Z");
});

test("capture reports permission denial plainly", async () => {
  const geolocation = {
    getCurrentPosition(_success, failure) {
      failure({ code: 1 });
    },
  };

  await assert.rejects(
    captureCurrentPosition({ geolocation }),
    /Geolocation permission was denied\./,
  );
});

test("capture reports unavailable and missing geolocation plainly", async () => {
  const unavailable = {
    getCurrentPosition(_success, failure) {
      failure({ code: 2 });
    },
  };

  await assert.rejects(
    captureCurrentPosition({ geolocation: unavailable }),
    /Geolocation is unavailable\./,
  );
  await assert.rejects(
    captureCurrentPosition({ geolocation: null }),
    /Geolocation is unavailable\./,
  );
});
