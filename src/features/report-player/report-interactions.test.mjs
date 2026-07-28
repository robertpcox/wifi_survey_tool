// FEATURE:      Merged Report Player interactions
// SURFACE:      node --test src/features/report-player/report-interactions.test.mjs
// WHY TOGETHER: One fixture proves dynamic modules render from one shared store snapshot.
// STATE:        Analyzed fixture snapshot
// RULES:        Pure rendering performs no load, parse, mutation, download, or timer work.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import {
  renderDynamicSections,
  renderPlayerFrame,
} from "./report-interactions.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("dynamic analysis sections independently render one shared fixture snapshot", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const sections = renderDynamicSections({
    result,
    analysis,
    thresholds: analysis.thresholds,
    comparison: null,
  }, []);
  assert.deepEqual(Object.keys(sections), ["kpi", "heatmap", "comparison", "methodology"]);
  assert.match(sections.kpi, /Run at a glance/);
  assert.match(sections.heatmap, /Where quality breaks down/);
  assert.match(sections.comparison, /Same route, different device/);
  assert.match(sections.methodology, /Methodology and export/);
});

test("Follow moves floor and camera while disabled Follow still renders frames", () => {
  const calls = [];
  const surface = {
    followWalker: value => calls.push(["follow", value]),
    render: value => calls.push(["render", value]),
  };
  const floorInput = { value: "0" };
  const first = { atMs: 1, walker: { lng: 170.1, lat: -45.1, z: 1 } };
  const floor = renderPlayerFrame({
    floor: 0,
    floorInput,
    frame: first,
    options: { follow: true, snap: null },
    surface,
  });
  assert.equal(floor, 1);
  assert.equal(floorInput.value, "1");
  assert.deepEqual(calls[0], ["follow", first.walker]);
  const second = { atMs: 2, walker: { lng: 170.2, lat: -45.2, z: 0 } };
  assert.equal(renderPlayerFrame({
    floor,
    floorInput,
    frame: second,
    options: { follow: false, snap: null },
    surface,
  }), 1);
  assert.equal(calls.filter(call => call[0] === "follow").length, 1);
  assert.deepEqual(calls.at(-1)[1].frame, second);
});
