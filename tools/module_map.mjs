// FEATURE:      Generated source-module inventory
// SURFACE:      node tools/module_map.mjs
// WHY TOGETHER: Source discovery and static module facts form one inventory pass
// STATE:        None
// RULES:        Output is deterministic, sharded, and derived only from src/
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isModuleMapDocumentName,
  moduleMapDocuments,
} from "./module_map_documents.mjs";
import { compactImportPath } from "./module_map_format.mjs";
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = resolve(repositoryRoot, "src");
const outputDirectory = resolve(repositoryRoot, "docs");
const SOURCE_EXTENSIONS = new Set([".cjs", ".css", ".html", ".js", ".mjs"]);
const TEST_SUFFIX = ".test.mjs";
function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
function repositoryPath(path) {
  return relative(repositoryRoot, path).split(sep).join("/");
}
async function collectSourceFiles(directory, files = []) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      await collectSourceFiles(path, files);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(path);
    }
  }
  return files;
}
function uniqueSorted(values) {
  return [...new Set(values)].sort(compareText);
}
function publicExports(text, extension) {
  if (![".cjs", ".js", ".mjs"].includes(extension)) return [];
  const names = [];
  const declaration = /\bexport\s+(?:async\s+)?(?:class|const|function|let|var)\s+([A-Za-z_$][\w$]*)/g;
  const named = /\bexport\s*\{([^}]*)\}/g;
  const namespace = /\bexport\s*\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\b/g;
  let match;
  if (/\bexport\s+default\b/.test(text)) names.push("default");
  while ((match = declaration.exec(text))) names.push(match[1]);
  while ((match = namespace.exec(text))) names.push(match[1]);
  while ((match = named.exec(text))) {
    for (const item of match[1].split(",")) {
      const parts = item.trim().split(/\s+as\s+/);
      if (parts[0]) names.push(parts.at(-1).trim());
    }
  }
  if (/\bexport\s*\*\s+from\b/.test(text)) names.push("*");
  return uniqueSorted(names);
}
function directImports(text, extension) {
  const imports = [];
  const staticImport = /\bimport\s+(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImport = /\bimport\s*\(\s*["']([^"']+)["']/g;
  const reExport = /\bexport\s+(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;
  const htmlDependency = /<(?:link|script)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/gi;
  const cssImport = /@import\s+(?:url\(\s*)?["']?([^"')\s;]+)/gi;
  const patterns = [staticImport, dynamicImport, reExport];
  if (extension === ".html") patterns.push(htmlDependency);
  if (extension === ".css") patterns.push(cssImport);
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text))) imports.push(match[1]);
  }
  return uniqueSorted(imports).map(value => compactImportPath(
    value.startsWith(".") && value.endsWith(".mjs") ? value.slice(0, -4) : value,
  ));
}
function measure(buffer) {
  const lines = buffer.toString("utf8").split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return {
    lines: lines.length,
    bytes: buffer.length,
    longestLineBytes: lines.reduce(
      (longest, line) => Math.max(longest, Buffer.byteLength(line)),
      0,
    ),
  };
}
const sourceFiles = (await collectSourceFiles(sourceRoot)).sort(compareText);
const allPaths = new Set(sourceFiles.map(repositoryPath));
const modules = sourceFiles.filter(path => !path.endsWith(TEST_SUFFIX));
const rows = await Promise.all(modules.map(async path => {
  const buffer = await readFile(path);
  const text = buffer.toString("utf8");
  const extension = extname(path).toLowerCase();
  const mappedPath = repositoryPath(path);
  const testPath = mappedPath.replace(/\.[^.]+$/, TEST_SUFFIX);
  return {
    path: mappedPath,
    exports: publicExports(text, extension),
    imports: directImports(text, extension),
    test: allPaths.has(testPath) ? testPath : null,
    ...measure(buffer),
  };
}));
const documents = moduleMapDocuments(rows);
const expectedNames = new Set(documents.map(document => document.name));
await mkdir(outputDirectory, { recursive: true });
const existingNames = await readdir(outputDirectory);
await Promise.all(existingNames
  .filter(name => isModuleMapDocumentName(name) && !expectedNames.has(name))
  .map(name => unlink(resolve(outputDirectory, name))));
await Promise.all(documents.map(document => (
  writeFile(resolve(outputDirectory, document.name), document.content, "utf8")
)));
console.log(`Wrote ${documents.length} module-map documents (${rows.length} modules).`);
