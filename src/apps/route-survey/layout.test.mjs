import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutCss = new URL("./layout.css", import.meta.url);

test("layout preserves the desktop map and panel split", async () => {
  const css = await readFile(layoutCss, "utf8");
  assert.match(
    css,
    /\.main\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*2fr 1fr;/s,
  );
  assert.match(css, /#map\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/s);
  assert.match(css, /\.panel\s*\{[^}]*overflow:\s*hidden;/s);
});

test("layout shows only the active tab and preserves playback controls", async () => {
  const css = await readFile(layoutCss, "utf8");
  assert.match(css, /\.tab-body\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.tab-body\.active\s*\{\s*display:\s*flex;/);
  assert.match(css, /\.playback-panel\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /button\.act:disabled\s*\{[^}]*cursor:\s*default;/s);
});

test("layout switches to the mobile-first map at 700 pixels", async () => {
  const css = await readFile(layoutCss, "utf8");
  const mobile = css.slice(css.indexOf("@media (max-width: 700px)"));
  assert.match(mobile, /\.main\s*\{[^}]*display:\s*block;/s);
  assert.match(mobile, /\.map-wrap\s*\{[^}]*height:\s*100%/s);
  assert.match(mobile, /\.panel\s*\{\s*display:\s*none;/);
  assert.match(mobile, /\.status-bar \.legend\s*\{\s*display:\s*none;/);
});
