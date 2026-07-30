// FEATURE:      Runner field-safety layout tests
// SURFACE:      Node assertions for runner-safety.css
// WHY TOGETHER: HUD navigation and modal Stop protection share the same mobile layout.
// STATE:        None
// RULES:        Controls stay visible and the Stop warning owns a backdrop.
// PROVENANCE:   Android field safety and closed-area Runner feedback

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./runner-safety.css", import.meta.url), "utf8");

test("checkpoint correction controls stay in the top HUD grid", () => {
  assert.match(css, /\.checkpoint-navigation\s*\{[\s\S]*grid-column: 1/);
  assert.match(css, /\.checkpoint-navigation\s*\{[\s\S]*grid-row: 5/);
  assert.match(css, /data-action="skip-checkpoint"/);
});

test("Stop confirmation uses a mobile modal with a backdrop", () => {
  assert.match(css, /\.stop-confirmation::backdrop/);
  assert.match(css, /width: min\(34rem, calc\(100% - 2rem\)\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
});
