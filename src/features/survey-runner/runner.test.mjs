import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./runner.css", import.meta.url), "utf8");
const entryCss = await readFile(new URL("./runner-entry.css", import.meta.url), "utf8");

test("Runner CSS keeps the map responsive and mobile capture controls usable", () => {
  assert.match(css, /\.runner-grid\s*\{[^}]*grid-template-columns:/s);
  assert.match(css, /#runner-map\s*\{[^}]*min-height:\s*72vh/s);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /#runner-map\s*\{\s*min-height:\s*44vh/);
  assert.match(css, /\.capture-actions button\s*\{\s*min-height:\s*4rem/);
  assert.match(css, /\.map-3d-toggle\s*\{[^}]*min-height:\s*2\.75rem/s);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.map-card\s*\{[^}]*position:\s*relative/);
  assert.match(css, /body\.runner-running \.map-display-controls\s*\{[^}]*bottom:/s);
});

test("credential sections are visibly separated without changing the entry form", () => {
  assert.match(css, /@import "\.\/runner-entry\.css"/);
  assert.match(entryCss, /\.credential-groups\s*\{[^}]*display:\s*grid/s);
  assert.match(entryCss, /\.credential-group\s*\{[^}]*border:\s*1px solid/s);
  assert.match(entryCss, /\.credential-group legend\s*\{[^}]*font-weight:\s*800/s);
});
