import assert from "node:assert/strict";
import test from "node:test";

import {
  csvCell,
  esc,
  tsName,
} from "./format.mjs";

test("esc protects HTML-significant characters and accepts null", () => {
  assert.equal(
    esc('&<tag title="value">'),
    "&amp;&lt;tag title=&quot;value&quot;&gt;",
  );
  assert.equal(esc("'single'"), "'single'");
  assert.equal(esc(null), "");
});

test("csvCell quotes cells and doubles embedded quotes", () => {
  assert.equal(csvCell('a,"b"'), '"a,""b"""');
  assert.equal(csvCell(null), '""');
});

test("tsName creates the extracted timestamped filename", () => {
  assert.equal(
    tsName("json", new Date("2026-07-28T01:02:03.456Z")),
    "route-survey-2026-07-28T01-02-03-456Z.json",
  );
});
