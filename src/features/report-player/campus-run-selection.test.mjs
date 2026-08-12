// FEATURE:      Consolidated report run selection
// SURFACE:      node --test src/features/report-player/campus-run-selection.test.mjs
// WHY TOGETHER: Default-all markup and guarded applied subsets prove the selector contract.
// STATE:        Synthetic eligible rows and fake controls
// RULES:        Unknown and empty selections never enter consolidation.
// PROVENANCE:   User-selected campus consolidation

import assert from "node:assert/strict";
import test from "node:test";

import { createCampusRunSelection } from "./campus-run-selection.mjs";

const currentResult = {
  run: {
    resultId: "run-current", startedAt: "2026-08-10T02:00:00.000Z",
    device: { name: "Current phone", os: "iOS", type: "mobile" }, band: "5",
  },
  meta: { surveyName: "Room survey" },
};
const entries = [{
  resultId: "run-other", surveyId: "survey-other",
  exportedAt: "2026-08-09T02:00:00.000Z",
  device: { name: "Other phone", os: "Android", type: "mobile" }, band: "5",
}];

test("selector starts with every eligible run checked and labelled", () => {
  const selection = createCampusRunSelection({
    currentResult, entries,
    surveys: [{ surveyId: "survey-other", surveyName: "Corridor survey" }],
  });
  const html = selection.html();
  assert.equal(selection.selectedCount, 2);
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 2);
  assert.equal((html.match(/checked>/g) ?? []).length, 2);
  assert.match(html, /Room survey/);
  assert.match(html, /Corridor survey/);
  assert.match(html, /Update consolidated report/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|>)/);
});

test("draft IDs are sanitized while applied IDs change only through controls", () => {
  const selection = createCampusRunSelection({ currentResult, entries });
  assert.deepEqual(selection.setDraft(["run-other", "forged"]), ["run-other"]);
  assert.deepEqual(selection.selectedIds.sort(), ["run-current", "run-other"]);
  assert.match(selection.html(), /1 of 2 selected/);
  assert.equal(selection.includes("forged"), false);
  assert.deepEqual(selection.apply(), ["run-other"]);
  assert.deepEqual(selection.selectedIds, ["run-other"]);
  assert.equal(selection.apply([]), null);
  assert.deepEqual(selection.selectedIds, ["run-other"]);
});

test("selector omits an ineligible current seed", () => {
  const selection = createCampusRunSelection({
    currentResult, entries, includeCurrent: false,
  });
  assert.deepEqual(selection.selectedIds, ["run-other"]);
  assert.doesNotMatch(selection.html(), /run-current/);
});

test("checkbox changes wait for explicit apply and clear cannot apply zero runs", async () => {
  const selection = createCampusRunSelection({ currentResult, entries });
  const inputs = [control({ campusRunId: "run-current" }),
    control({ campusRunId: "run-other" })];
  inputs.forEach(input => { input.checked = true; });
  const apply = control();
  const clear = control();
  const all = control();
  const count = { textContent: "" };
  const status = { textContent: "" };
  const nodes = new Map([
    ["[data-campus-run-action=apply]", apply],
    ["[data-campus-run-action=clear]", clear],
    ["[data-campus-run-action=all]", all],
    ["[data-campus-run-count]", count],
    ["[data-campus-run-status]", status],
  ]);
  let applied = null;
  selection.bind({
    querySelectorAll: () => inputs,
    querySelector: selector => nodes.get(selector) ?? null,
  }, ids => { applied = ids; });
  inputs[0].checked = false;
  inputs[0].change();
  assert.equal(selection.selectedCount, 2);
  assert.equal(apply.disabled, false);
  await apply.click();
  assert.deepEqual(applied, ["run-other"]);
  clear.click();
  assert.equal(apply.disabled, true);
  assert.match(status.textContent, /Choose at least one/);
});

function control(dataset = {}) {
  return {
    dataset,
    disabled: false,
    addEventListener(name, listener) { this[name] = listener; },
  };
}
