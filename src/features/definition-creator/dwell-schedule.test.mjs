// FEATURE:      Creator dwell schedule
// SURFACE:      Dwell schedule stylesheet tests
// WHY TOGETHER: Card, input, and responsive selectors define one visual component.
// STATE:        None
// RULES:        Tests keep the leg schedule responsive and editable.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./dwell-schedule.css", import.meta.url), "utf8");

test("dwell schedule styles leg cards, inputs, and narrow layouts", () => {
  assert.match(css, /\.creator-leg-card/);
  assert.match(css, /\.creator-leg-card input/);
  assert.match(css, /@media \(max-width: 760px\)/);
});
