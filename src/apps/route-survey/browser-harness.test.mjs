import assert from "node:assert/strict";
import test from "node:test";

import { browserPaths } from "./browser-harness.mjs";

test("browserPaths uses only the external default installations", () => {
  assert.deepEqual(browserPaths({}), {
    chrome: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    puppeteer:
      "/tmp/wifi-survey-puppeteer/node_modules/puppeteer-core",
  });
});

test("browserPaths honors explicit external installation paths", () => {
  assert.deepEqual(browserPaths({
    CHROME_PATH: "/external/chrome",
    PUPPETEER_CORE_PATH: "/external/node_modules/puppeteer-core",
  }), {
    chrome: "/external/chrome",
    puppeteer: "/external/node_modules/puppeteer-core",
  });
});
