import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
const allowed = {
  apps: new Set(["apps", "features", "domain", "adapters", "shared"]),
  features: new Set(["features", "domain", "adapters", "shared"]),
  domain: new Set(["domain", "shared"]),
  adapters: new Set(["adapters", "domain", "shared"]),
  shared: new Set(["shared"]),
};
const importPattern =
  /\b(?:import\s+(?:[^"'`;]*?\s+from\s+)?|export\s+(?:\*|\{[^}]*\})\s+from\s+)["']([^"']+)["']/g;

export async function importBoundaryFindings(root = repositoryRoot) {
  const sourceRoot = resolve(root, "src");
  const findings = [];
  for (const path of await modules(sourceRoot)) {
    const owner = ownerOf(sourceRoot, path);
    const text = await readFile(path, "utf8");
    for (const match of text.matchAll(importPattern)) {
      if (!match[1].startsWith(".")) continue;
      const target = resolve(dirname(path), match[1]);
      const dependency = ownerOf(sourceRoot, target);
      const repositoryPath = relative(root, path).split(sep).join("/");
      if (!dependency.layer || !allowed[owner.layer]?.has(dependency.layer)) {
        findings.push(`${repositoryPath}: forbidden import ${match[1]}`);
      } else if (
        owner.layer === "apps"
        && dependency.layer === "apps"
        && owner.area !== dependency.area
      ) {
        findings.push(`${repositoryPath}: cross-app import ${match[1]}`);
      } else if (
        owner.layer === "features"
        && dependency.layer === "features"
        && owner.area !== dependency.area
      ) {
        findings.push(`${repositoryPath}: cross-feature import ${match[1]}`);
      }
    }
  }
  return findings;
}

function ownerOf(sourceRoot, path) {
  const parts = relative(sourceRoot, path).split(sep);
  return { layer: allowed[parts[0]] ? parts[0] : null, area: parts[1] || null };
}

async function modules(directory) {
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
    if (entry.isDirectory()) files.push(...await modules(path));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(path);
  }
  return files.sort();
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = resolve(process.argv[2] || repositoryRoot);
  const findings = await importBoundaryFindings(root);
  if (findings.length) {
    console.error(`Import-boundary gate failed:\n- ${findings.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log("Import-boundary gate passed.");
  }
}
