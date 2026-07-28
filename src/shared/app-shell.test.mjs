import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./app-shell.css", import.meta.url), "utf8");

test("shared shell stylesheet provides layout and visible access controls", () => {
  for (const selector of ["header", "main", ".shell-card", ".map-access"]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.match(css, /min-height: 2\.75rem/);
});
