import { readFile, readdir } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
const extensions = new Set([".css", ".html", ".js", ".mjs"]);
const metadataPattern =
  /^\s*(?:\/\/|\/\*+|\*)\s*(?:FEATURE|SURFACE|WHY TOGETHER|STATE|RULES|PROVENANCE):/im;

export function headerFindings(text, path = "<text>") {
  const opening = text.split(/\r?\n/).slice(0, 15).join("\n");
  return metadataPattern.test(opening)
    ? [`${path}: authored metadata header block is forbidden`]
    : [];
}

export async function checkHeaders(root = repositoryRoot) {
  const findings = [];
  for (const directory of ["src", "tools"]) {
    for (const path of await sourceFiles(resolve(root, directory))) {
      findings.push(...headerFindings(await readFile(path, "utf8"), path));
    }
  }
  return findings;
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
