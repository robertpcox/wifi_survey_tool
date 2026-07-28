// FEATURE:      Full-screen Report Player components
// SURFACE:      player-components.css
// WHY TOGETHER: Rail scrolling, transport reachability, and focus styling are its CSS contract.
// STATE:        Desktop and narrow Player presentation
// RULES:        Evidence scrolls independently and interactive evidence retains visible focus.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./player-components.css", import.meta.url), "utf8");

test("Player components keep the rail independently scrollable", () => {
  assert.match(css, /\.player-evidence-rail\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.player-rail-heading\s*\{[^}]*position:\s*sticky/s);
});

test("Player transport and evidence keep reachable focus and touch treatment", () => {
  assert.match(css, /\.player-transport\s*\{[^}]*display:\s*grid/s);
  assert.match(css, /\.player-transport button,[\s\S]*min-height:\s*2\.4rem/);
  assert.match(css, /\.player-chart circle:focus\s*\{[^}]*stroke-width:\s*4/s);
});
