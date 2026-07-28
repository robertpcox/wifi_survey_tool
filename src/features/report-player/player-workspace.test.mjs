// FEATURE:      Full-screen Report Player workspace
// SURFACE:      player-workspace.css
// WHY TOGETHER: Viewport containment, shared map/rail layout, and responsive rows form one contract.
// STATE:        Report flow versus active desktop or narrow Player
// RULES:        Player body never scrolls; map, rail, and transport stay inside the viewport.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./player-workspace.css", import.meta.url), "utf8");

test("Player workspace contains body scroll and reserves map and rail columns", () => {
  assert.match(css, /body\[data-app="report-player"\]\.player-active\s*\{[^}]*height:\s*100dvh/s);
  assert.match(css, /body\[data-app="report-player"\]\.player-active\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+minmax\(340px,\s*420px\)/);
});

test("narrow Player stacks the map and rail while keeping transport inset", () => {
  assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*grid-template-rows:\s*minmax\(240px,\s*48%\)\s+minmax\(0,\s*52%\)/);
  assert.match(css, /\.player-transport-slot\s*\{[^}]*bottom:\s*1rem/s);
});
