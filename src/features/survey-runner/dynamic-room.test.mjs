// FEATURE:      Dynamic room Runner layout tests
// SURFACE:      Node assertions for dynamic-room.css
// WHY TOGETHER: Touch sizing, map priority, and mobile compaction form one layout contract.
// STATE:        data-dynamic-room-active and mobile viewport
// RULES:        The shared planned HUD stays visible; the panel clears the check-in bar.
// PROVENANCE:   Ad-hoc room survey field workflow

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./dynamic-room.css", import.meta.url), "utf8");

test("dynamic capture keeps the planned HUD and clears the check-in bar", () => {
  assert.match(css, /\.dynamic-room-panel\s*\{[\s\S]*position: fixed/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /bottom: calc\(max\(\.75rem, env\(safe-area-inset-bottom\)\) \+ 6\.6rem\)/);
  assert.match(css, /span:has\(> \[data-target-distance\]\)/);
  assert.doesNotMatch(css, /\.capture-actions\s*\{\s*display: none/);
  assert.doesNotMatch(css, /\[data-current-target\]/);
  assert.doesNotMatch(css, /skip-checkpoint/);
  assert.doesNotMatch(css, /dynamic-pass-mark|dynamic-check-in|data-action="dynamic-dwell"/);
});

test("dynamic actions remain compact, touch-sized, and responsive", () => {
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height: 3\.4rem/);
  assert.match(css, /data-action="dynamic-continue-dwell"/);
  assert.match(css, /data-action="dynamic-extend-dwell"/);
  assert.match(css, /data-action="dynamic-retry"/);
  assert.match(css, /data-action="dynamic-clear"/);
  assert.match(css, /@media \(max-width: 430px\)/);
});
