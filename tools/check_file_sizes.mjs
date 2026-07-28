#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { extname, relative, resolve, sep } from "node:path";

const TARGET_LINES = 150;
const TARGET_BYTES = 10_000;
const TARGET_LINE_BYTES = 160;
const CEILING_LINES = 400;
const CEILING_BYTES = 20_000;
const CEILING_LINE_BYTES = 500;
const CONTENT_EXCLUSIONS = new Set(["data", "results"]);
const SYSTEM_EXCLUSIONS = new Set([".git", "node_modules"]);
const TEXT_EXTENSIONS = new Set([
  ".cjs", ".css", ".csv", ".html", ".js", ".json", ".jsx", ".md", ".mjs",
  ".py", ".scss", ".sh", ".svg", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);

const argumentsList = process.argv.slice(2);
const allowReview = argumentsList.includes("--allow-review");
const rootArgument = argumentsList.find(argument => !argument.startsWith("--")) || ".";
const root = resolve(rootArgument);

async function collectFiles(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (SYSTEM_EXCLUSIONS.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (!CONTENT_EXCLUSIONS.has(entry.name.toLowerCase())) await collectFiles(path, files);
      continue;
    }
    if (entry.isFile() && TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files;
}

async function measure(path) {
  const [buffer, fileStat] = await Promise.all([readFile(path), stat(path)]);
  const text = buffer.toString("utf8");
  const lines = text.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  const longestLineBytes = lines.reduce(
    (longest, line) => Math.max(longest, Buffer.byteLength(line)),
    0,
  );
  return {
    path: relative(root, path).split(sep).join("/"),
    lines: lines.length,
    bytes: fileStat.size,
    longestLineBytes,
  };
}

function classify(file) {
  const ceilingReasons = [];
  const reviewReasons = [];
  if (file.lines > CEILING_LINES) ceilingReasons.push(`${file.lines} lines`);
  if (file.bytes > CEILING_BYTES) ceilingReasons.push(`${file.bytes} bytes`);
  if (file.longestLineBytes > CEILING_LINE_BYTES) {
    ceilingReasons.push(`${file.longestLineBytes}-byte line`);
  }
  if (file.lines > TARGET_LINES) reviewReasons.push(`${file.lines} lines`);
  if (file.bytes > TARGET_BYTES) reviewReasons.push(`${file.bytes} bytes`);
  if (file.longestLineBytes > TARGET_LINE_BYTES) {
    reviewReasons.push(`${file.longestLineBytes}-byte line`);
  }
  if (ceilingReasons.length) return { level: "FAIL", reasons: ceilingReasons };
  if (reviewReasons.length) return { level: "REVIEW", reasons: reviewReasons };
  return { level: "OK", reasons: [] };
}

function printRows(label, rows) {
  if (!rows.length) return;
  console.log(`\n${label}`);
  for (const row of rows) {
    console.log(`  ${row.file.path} — ${row.result.reasons.join(", ")}`);
  }
}

const files = await collectFiles(root);
const rows = await Promise.all(files.sort().map(async path => {
  const file = await measure(path);
  return { file, result: classify(file) };
}));
const failures = rows.filter(row => row.result.level === "FAIL");
const reviews = rows.filter(row => row.result.level === "REVIEW");

printRows("FAIL — exceeds a hard ceiling", failures);
printRows("REVIEW — exceeds the 150-line context target", reviews);
console.log(
  `\nChecked ${rows.length} files: ${failures.length} failed, ${reviews.length} need review.`,
);

if (failures.length || (reviews.length && !allowReview)) process.exitCode = 1;
