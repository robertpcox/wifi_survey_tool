// FEATURE:      Report Player reference migration
// SURFACE:      referenceReportFindings(root), CLI
// WHY TOGETHER: Inline-data extraction and memory-only token assertions guard one legacy migration.
// STATE:        None
// RULES:        Preserved report sources load data and prompt for access without embedded credentials.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);

export async function referenceReportFindings(root = repositoryRoot) {
  const directory = resolve(root, "data/reference/report_player");
  const [report, player, dataText] = await Promise.all([
    readFile(resolve(directory, "index.html"), "utf8"),
    readFile(resolve(directory, "ndh_player.html"), "utf8"),
    readFile(resolve(directory, "report_data.inline.json"), "utf8"),
  ]);
  const findings = [];
  if (/\b(?:const|let|var)\s+DATA\s*=\s*\{/.test(report)) {
    findings.push("index.html still embeds a DATA object literal");
  }
  if (!/fetch\(\"report_data\.inline\.json\"/.test(report)) {
    findings.push("index.html does not load the extracted report data");
  }
  try {
    JSON.parse(dataText);
  } catch {
    findings.push("report_data.inline.json is not valid JSON");
  }
  if (/\bMAP_TOKEN\b/.test(player)) {
    findings.push("ndh_player.html still names the embedded MAP_TOKEN");
  }
  if (!/window\.prompt\(\"Private MazeMap access/.test(player)) {
    findings.push("ndh_player.html does not request runtime map access");
  }
  if (/localStorage|sessionStorage|indexedDB/.test(player)) {
    findings.push("ndh_player.html persists runtime state or credentials");
  }
  return findings;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const findings = await referenceReportFindings(
    resolve(process.argv[2] || repositoryRoot),
  );
  if (findings.length) {
    console.error(`Reference report gate failed:\n- ${findings.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Reference report gate passed.");
  }
}
