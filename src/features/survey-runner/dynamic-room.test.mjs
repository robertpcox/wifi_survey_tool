// FEATURE:      Dynamic room Runner layout tests
// SURFACE:      Node assertions for dynamic-room.css
// WHY TOGETHER: Touch sizing, map priority, and mobile compaction form one layout contract.
// STATE:        data-dynamic-room-active and mobile viewport
// RULES:        Existing route actions yield to a safe-area-aware bottom panel.
// PROVENANCE:   Ad-hoc room survey field workflow

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./dynamic-room.css", import.meta.url), "utf8");

test("dynamic capture replaces route actions without taking over the map", () => {
  assert.match(css, /data-dynamic-room-active="true"[\s\S]*>\s*\.capture-actions/);
  assert.match(css, /\.dynamic-room-panel\s*\{[\s\S]*position: fixed/);
  assert.match(css, /pointer-events: auto/);
  assert.match(css, /safe-area-inset-bottom/);
  assert.match(css, /\.run-hud > \.target-label/);
  assert.match(css, /\.run-hud > \[data-current-target\]/);
  assert.match(css, /\.run-hud > \.dwell-status/);
  assert.match(css, /\[data-action="skip-checkpoint"\][\s\S]*display: none/);
  assert.match(css, /span:has\(> \[data-target-distance\]\)/);
  assert.match(css, /\.run-vitals\s*\{[\s\S]*grid-column: 1/);
  assert.match(css, /\.checkpoint-stop\s*\{[\s\S]*grid-row: 1/);
});

test("dynamic actions remain compact, touch-sized, and responsive", () => {
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height: 3\.4rem/);
  assert.match(css, /data-action="dynamic-extend-dwell"/);
  assert.match(css, /data-action="dynamic-retry"/);
  assert.match(css, /data-action="dynamic-clear"/);
  assert.match(css, /@media \(max-width: 430px\)/);
});
