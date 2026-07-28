import { createHash } from "node:crypto";
import { readFile, readdir, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = resolve(new URL("../", import.meta.url).pathname);
const extensions = new Set([".css", ".html", ".js", ".json", ".md", ".mjs"]);
const defaultTargets = [
  "src",
  "tools",
  "data/characterization",
  "data/manifests",
  "data/routes",
  "data/surveys",
  "docs",
  "results",
];
const knownSecretHashes = new Set([
  "c1fdd0f08d4024a1a482cdf5cfd8f47255f9c637dd2d249555a8a8e6d7d1f3a6",
]);
const hashCandidatePattern = /\b[a-f0-9]{32}\b/gi;
const literalPattern = /\b(?:MAP_TOKEN|apiKey|appKey|secret|password|token)\b\s*[:=]\s*["'`]([^"'`]+)["'`]/gi;

async function collect(path, files = []) {
  let metadata;
  try {
    metadata = await stat(path);
  } catch (error) {
    if (error.code === "ENOENT") return files;
    throw error;
  }
  if (metadata.isFile()) {
    if (extensions.has(extname(path).toLowerCase())) files.push(path);
    return files;
  }
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    await collect(resolve(path, entry.name), files);
  }
  return files;
}

export function hashSecret(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function secretFindings(
  text,
  path = "<text>",
  knownHashes = knownSecretHashes,
) {
  const findings = [];
  for (const match of text.matchAll(hashCandidatePattern)) {
    if (knownHashes.has(hashSecret(match[0]))) {
      findings.push(`${path}: known embedded map credential`);
    }
  }
  for (const match of text.matchAll(literalPattern)) {
    const value = match[1].trim();
    if (!value || value.startsWith("${") || value === "null") continue;
    findings.push(`${path}: credential-like literal assigned to ${match[0]
      .slice(0, match[0].indexOf(value))}`);
  }
  return findings;
}

export async function scanSecrets(targets = defaultTargets) {
  const files = [];
  for (const target of targets) await collect(resolve(root, target), files);
  const findings = [];
  for (const path of files.sort()) {
    findings.push(...secretFindings(await readFile(path, "utf8"), path));
  }
  return { files, findings };
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (isCli) {
  const targets = process.argv.slice(2);
  const result = await scanSecrets(targets.length ? targets : defaultTargets);
  if (result.findings.length) {
    console.error(`Secret scan failed:\n- ${result.findings.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Secret scan passed (${result.files.length} files).`);
  }
}
