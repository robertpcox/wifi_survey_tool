import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./runner.css", import.meta.url), "utf8");

test("Runner CSS keeps the map responsive and mobile capture controls usable", () => {
  assert.match(css, /\.runner-grid\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /#runner-map\s*\{[^}]*min-height:\s*72vh/s);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /#runner-map\s*\{\s*min-height:\s*44vh/);
  assert.match(css, /\.capture-actions button\s*\{\s*min-height:\s*4rem/);
});
