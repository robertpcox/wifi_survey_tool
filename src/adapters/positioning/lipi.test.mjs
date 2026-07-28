import test from "node:test";
import assert from "node:assert/strict";

import { fetchLipiPosition } from "./lipi.mjs";

test("LiPi is called directly with the page referrer restored", async () => {
  const response = { status: 200 };
  const signal = new AbortController().signal;
  let request;
  const result = await fetchLipiPosition({
    lipiUrl: "https://position.example/device",
    referrer: "https://survey.example/apps/runner/",
  }, {
    signal,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response;
    },
  });

  assert.equal(result, response);
  assert.deepEqual(request, {
    url: "https://position.example/device",
    options: {
      headers: { Accept: "application/json" },
      referrer: "https://survey.example/apps/runner/",
      referrerPolicy: "unsafe-url",
      signal,
    },
  });
});
