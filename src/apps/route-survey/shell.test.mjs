import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const shellCss = new URL("./shell.css", import.meta.url);

test("shell owns the fixed viewport and scroll containment", async () => {
  const css = await readFile(shellCss, "utf8");
  assert.match(css, /body\s*\{[\s\S]*height:\s*100dvh;/);
  assert.match(css, /body\s*\{[\s\S]*overflow:\s*hidden;/);
  assert.match(css, /body\s*\{[\s\S]*overscroll-behavior:\s*none;/);
});

test("shell styles configuration, status, sources, and route selection", async () => {
  const css = await readFile(shellCss, "utf8");
  for (const selector of [
    "details.config",
    ".config-body",
    ".cfg-row",
    ".source-checks",
    ".route-picker",
    ".status-bar",
    ".swatch.cloud",
    ".swatch.lipi",
  ]) {
    assert.ok(css.includes(selector), `${selector} is missing`);
  }
});

test("shell keeps route selection usable on a narrow screen", async () => {
  const css = await readFile(shellCss, "utf8");
  const mobile = css.slice(css.indexOf("@media (max-width: 700px)"));
  assert.match(mobile, /\.route-config-field\s*\{[^}]*width:\s*100%/);
  assert.match(mobile, /\.route-picker\s*\{[^}]*flex-direction:\s*column/);
  assert.match(mobile, /\.route-picker select\s*\{[^}]*width:\s*100%/);
});
