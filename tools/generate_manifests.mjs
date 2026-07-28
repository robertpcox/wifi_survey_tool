import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSurveyDefinitionV3 } from "../src/domain/survey-definition-v3.mjs";
import { validateSurveyResultV3 } from "../src/domain/survey-result-v3.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function generateManifests({
  root = repositoryRoot,
  outputDir = resolve(root, "data/manifests"),
} = {}) {
  const readmePath = resolve(outputDir, "README.md");
  const readme = await readFile(readmePath, "utf8").catch(error => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  const surveys = await loadFamily(
    resolve(root, "data/surveys"),
    root,
    validateSurveyDefinitionV3,
    surveyEntry,
  );
  const results = await loadFamily(
    resolve(root, "results"),
    root,
    validateSurveyResultV3,
    resultEntry,
  );
  const surveyManifest = { schemaVersion: 3, surveys };
  const resultManifest = { schemaVersion: 3, results };
  const customers = customerManifests(surveys, results);
  const summary = {
    schemaVersion: 3,
    valid: true,
    surveyCount: surveys.length,
    resultCount: results.length,
    customerCount: customers.length,
  };
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(resolve(outputDir, "customers"), { recursive: true });
  if (readme) await writeFile(readmePath, readme);
  await writeJson(resolve(outputDir, "survey-manifest.v3.json"), surveyManifest);
  await writeJson(resolve(outputDir, "result-manifest.v3.json"), resultManifest);
  await writeJson(resolve(outputDir, "validation-summary.v3.json"), summary);
  for (const customer of customers) {
    const path = resolve(outputDir, "customers", `${customer.customerId}.manifest.v3.json`);
    await writeJson(path, customer);
  }
  return { surveyManifest, resultManifest, customers, summary };
}

async function loadFamily(directory, root, validate, createEntry) {
  const files = await jsonFiles(directory);
  const entries = [];
  for (const path of files) {
    const value = JSON.parse(await readFile(path, "utf8"));
    const result = validate(value);
    if (!result.valid) {
      throw new Error(`${repositoryPath(root, path)}:\n${result.errors.join("\n")}`);
    }
    entries.push(createEntry(value, repositoryPath(root, path)));
  }
  return entries.sort(compareEntry);
}

async function jsonFiles(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  const paths = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await jsonFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".json")) paths.push(path);
  }
  return paths.sort();
}

function surveyEntry(definition, path) {
  return {
    surveyId: definition.meta.surveyId,
    surveyName: definition.meta.surveyName,
    customerId: definition.meta.customerId,
    customerName: definition.meta.customerName,
    campusId: definition.meta.campusId,
    routeId: definition.meta.route.routeId,
    routeHash: definition.meta.route.hash,
    path,
  };
}

function resultEntry(result, path) {
  return {
    resultId: result.run.resultId,
    surveyId: result.run.surveyId,
    customerId: result.run.customerId,
    campusId: result.run.campusId,
    routeHash: result.run.routeHash,
    device: result.run.device,
    band: result.run.band,
    completionStatus: result.run.completionStatus,
    exportedAt: result.run.exportedAt,
    path,
  };
}

function customerManifests(surveys, results) {
  const ids = [...new Set([
    ...surveys.map(entry => entry.customerId),
    ...results.map(entry => entry.customerId),
  ])].sort();
  return ids.map(customerId => ({
    schemaVersion: 3,
    customerId,
    customerName: surveys.find(entry => entry.customerId === customerId)?.customerName || null,
    surveys: surveys.filter(entry => entry.customerId === customerId),
    results: results.filter(entry => entry.customerId === customerId),
  }));
}

function compareEntry(left, right) {
  const leftKey = left.surveyId || left.resultId;
  const rightKey = right.surveyId || right.resultId;
  return leftKey.localeCompare(rightKey) || left.path.localeCompare(right.path);
}

function repositoryPath(root, path) {
  return relative(root, path).split(sep).join("/");
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const generated = await generateManifests();
  console.log(
    `Generated manifests: ${generated.summary.surveyCount} surveys, `
      + `${generated.summary.resultCount} results, `
      + `${generated.summary.customerCount} customers.`,
  );
}
