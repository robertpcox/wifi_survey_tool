// FEATURE:      Authored module metadata
// SURFACE:      headerFindings(), checkHeaders(), and the header-check CLI
// WHY TOGETHER: Header parsing, source discovery, and CLI reporting form one validation gate
// STATE:        None
// RULES:        New sources need complete headers; explicit legacy exceptions must remain unresolved
// PROVENANCE:   Step 5 module-header precondition

import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
const exceptionsPath =
  "data/characterization/step5/legacy-header-exceptions.json";
const extensions = new Set([".css", ".html", ".js", ".mjs"]);
const metadataFields = [
  "FEATURE",
  "SURFACE",
  "WHY TOGETHER",
  "STATE",
  "RULES",
  "PROVENANCE",
];
const metadataPattern = new RegExp(
  `^(${metadataFields.join("|")}):\\s*(.*)$`,
);

export function headerFindings(text, path = "<text>") {
  const values = new Map();
  for (const line of leadingHeaderLines(text)) {
    const match = metadataPattern.exec(commentContent(line));
    if (match && !values.has(match[1])) values.set(match[1], match[2].trim());
  }
  const incomplete = metadataFields.filter(field => !values.get(field));
  return incomplete.length
    ? [`${path}: missing or blank metadata fields: ${incomplete.join(", ")}`]
    : [];
}

export async function checkHeaders(root = repositoryRoot) {
  const findings = [];
  const exceptions = await legacyHeaderExceptions(root);
  for (const directory of ["src", "tools"]) {
    for (const path of await sourceFiles(resolve(root, directory))) {
      const sourcePath = relative(root, path).replaceAll("\\", "/");
      const sourceFindings = headerFindings(await readFile(path, "utf8"), sourcePath);
      if (!exceptions.delete(sourcePath)) {
        findings.push(...sourceFindings);
      } else if (!sourceFindings.length) {
        findings.push(`${sourcePath}: stale legacy header exception`);
      }
    }
  }
  for (const sourcePath of exceptions) {
    findings.push(`${sourcePath}: stale legacy header exception (file is not scanned)`);
  }
  return findings;
}

async function legacyHeaderExceptions(root) {
  let text;
  try {
    text = await readFile(resolve(root, exceptionsPath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return new Set();
    throw error;
  }
  const paths = JSON.parse(text);
  const deterministic = Array.isArray(paths)
    && paths.every(path => typeof path === "string" && path)
    && JSON.stringify(paths) === JSON.stringify([...new Set(paths)].sort());
  if (!deterministic) {
    throw new TypeError(
      `${exceptionsPath} must be a sorted JSON array of unique repository-relative paths`,
    );
  }
  return new Set(paths);
}

function leadingHeaderLines(text) {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).slice(0, 15);
  const header = [];
  let closing = "";
  for (const line of lines) {
    const content = line.trim();
    if (!content && !header.length) continue;
    if (closing) {
      header.push(line);
      if (content.includes(closing)) closing = "";
      continue;
    }
    if (/^\/\//.test(content)) {
      header.push(line);
      continue;
    }
    const block = content.startsWith("/*")
      ? ["*/", content.slice(2)]
      : content.startsWith("<!--") && ["-->", content.slice(4)];
    if (block) {
      header.push(line);
      if (!block[1].includes(block[0])) closing = block[0];
      continue;
    }
    if (!content && header.length) continue;
    break;
  }
  return header;
}

function commentContent(line) {
  return line
    .replace(/^\s*(?:\/\/|\/\*+|<!--|\*)\s?/, "")
    .replace(/\s*(?:\*\/|-->)\s*$/, "")
    .trim();
}

async function sourceFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(path));
    else if (entry.isFile() && extensions.has(extname(path))) files.push(path);
  }
  return files.sort();
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = resolve(process.argv[2] || repositoryRoot);
  const findings = await checkHeaders(root);
  if (findings.length) {
    console.error(`Header gate failed:\n- ${findings.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Header gate passed.");
  }
}
