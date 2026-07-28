import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./runner-active.css", import.meta.url), "utf8");

test("active Runner keeps the map and capture controls inside the viewport", () => {
  assert.match(css, /body\.runner-running\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /body\.runner-running \.runner-page\s*\{[^}]*position:\s*fixed/s);
  assert.match(css, /body\.runner-running #runner-map\s*\{[^}]*height:\s*100dvh/s);
  assert.match(css, /body\.runner-running \.run-hud\s*\{[^}]*safe-area-inset-top/s);
  assert.match(css, /body\.runner-running \.capture-actions\s*\{[^}]*position:\s*absolute/s);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.poll-dot\[data-state="ok"\]/);
});
