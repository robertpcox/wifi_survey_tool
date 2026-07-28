import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./components.css", import.meta.url), "utf8");

test("Creator components give the centre map a materially large workspace", () => {
  assert.match(css, /\.creator-main/);
  assert.match(css, /1800px/);
  assert.match(css, /\[data-floor-map\]/);
  assert.match(css, /height: clamp\(34rem, 70vh, 58rem\)/);
  assert.match(css, /min-height: 34rem/);
  assert.match(css, /\.route-line/);
  assert.match(css, /fill: none/);
  assert.match(css, /\.checkpoint-dot/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
