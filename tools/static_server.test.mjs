import assert from "node:assert/strict";
import test from "node:test";

import { contentTypeFor } from "./static_server.mjs";

test("static browser server declares JavaScript MIME", () => {
  assert.equal(contentTypeFor("main.mjs"), "application/javascript; charset=utf-8");
  assert.equal(contentTypeFor("unknown.bin"), "application/octet-stream");
});
