// FEATURE:      Report Player reference migration
// SURFACE:      node --test tools/check_reference_report.test.mjs
// WHY TOGETHER: Passing and planted reference fixtures prove the migration gate failure path.
// STATE:        Temporary reference directory
// RULES:        Tests contain no real credential and make no network request.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { referenceReportFindings } from "./check_reference_report.mjs";

test("reference gate passes extracted data and fails planted inline/token literals", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-reference-report-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, "data/reference/report_player");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "index.html"),
    'let DATA; DATA = await fetch("report_data.inline.json").then(r => r.json());',
  );
  await writeFile(
    join(directory, "ndh_player.html"),
    'let mapToken = window.prompt("Private MazeMap access (held in memory only):");',
  );
  await writeFile(join(directory, "report_data.inline.json"), "{}\n");
  assert.deepEqual(await referenceReportFindings(root), []);

  await writeFile(join(directory, "index.html"), "const DATA = {};");
  const plantedPlayer = [
    "const MAP",
    "_TOKEN = \"not-a-real-value\"; sessionStorage.setItem(\"x\", MAP",
    "_TOKEN);",
  ].join("");
  await writeFile(
    join(directory, "ndh_player.html"),
    plantedPlayer,
  );
  const findings = await referenceReportFindings(root);
  assert.ok(findings.some(item => item.includes("embeds a DATA")));
  assert.ok(findings.some(item => item.includes("MAP_TOKEN")));
  assert.ok(findings.some(item => item.includes("persists")));
});
