import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./creator.css", import.meta.url), "utf8");

test("Creator stylesheet places route, map, and authoring in desktop columns", () => {
  assert.match(css, /\.creator-layout/);
  assert.match(css, /grid-template-areas: "route map authoring"/);
  assert.match(css, /minmax\(34rem, 2fr\)/);
  assert.match(css, /\.creator-map-stage/);
  assert.match(css, /\.creator-map-choice\[hidden\]/);
  assert.match(css, /position: sticky/);
});
