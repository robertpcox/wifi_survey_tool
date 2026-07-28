import test from "node:test";
import assert from "node:assert/strict";

import { fetchCloudPosition } from "./cloud.mjs";

test("Cloud keeps the configurable positioning proxy URL and headers", async () => {
  const response = { status: 200 };
  const signal = new AbortController().signal;
  const appKey = ["memory", "app", "key"].join("-");
  let request;
  const config = {
    cloudBase: "  https://proxy.example///  ",
    configId: "config & floor",
    clientIp: "10.0.0.8",
    appId: "memory-app-id",
    appKey,
  };
  const result = await fetchCloudPosition(config, {
    signal,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response;
    },
  });

  assert.equal(result, response);
  assert.equal(
    request.url,
    "https://proxy.example/mm-positioning-proxy/position?"
      + "configId=config+%26+floor&clientIp=10.0.0.8",
  );
  assert.deepEqual(request.options, {
    headers: {
      Accept: "application/json",
      "X-Mazemap-App-Id": "memory-app-id",
      "X-Mazemap-App-Key": appKey,
    },
    signal,
  });
});
