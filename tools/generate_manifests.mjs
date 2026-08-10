// FEATURE:      Deterministic survey and result discovery manifests
// SURFACE:      generateManifests(options), CLI
// WHY TOGETHER: Source validation, privacy-safe projections, and customer indexes form one generator.
// STATE:        Generated data/manifests output
// RULES:        Discovery manifests omit operational credentials such as device Client IP.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { readFile, readdir, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSurveyDefinitionV3 } from "../src/domain/survey-definition-v3.mjs";
import { validateSurveyResultV3 } from "../src/domain/survey-result-v3.mjs";
import {
  compareManifestEntry,
  customerManifests,
  resultManifestEntry,
  surveyManifestEntry,
} from "./manifest_entries.mjs";
import { loadReviewedExceptions } from "./reviewed_exception_manifests.mjs";

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
    resolve(root, "data/surveys"), root, validateSurveyDefinitionV3, surveyManifestEntry);
  const loadedResults = await loadFamily(
    resolve(root, "results"), root, validateSurveyResultV3, resultManifestEntry);
  const reviewedExceptions = await loadReviewedExceptions(root, loadedResults);
  const results = loadedResults.map(entry => ({
    ...entry,
    reviewedExceptions: reviewedExceptions.exceptions
      .filter(item => item.resultId === entry.resultId),
  }));
  const surveyManifest = { schemaVersion: 3, surveys };
  const resultManifest = { schemaVersion: 3, results };
  const customers = customerManifests(surveys, results);
  const summary = {
    schemaVersion: 3,
    valid: true,
    surveyCount: surveys.length,
    resultCount: results.length,
    customerCount: customers.length,
    reviewedExceptionCount: reviewedExceptions.exceptions.length,
  };
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(resolve(outputDir, "customers"), { recursive: true });
  if (readme) await writeFile(readmePath, readme);
  await writeJson(resolve(outputDir, "survey-manifest.v3.json"), surveyManifest);
  await writeJson(resolve(outputDir, "result-manifest.v3.json"), resultManifest);
  await writeJson(
    resolve(outputDir, "reviewed-exceptions.v3.json"),
    reviewedExceptions,
  );
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
  return entries.sort(compareManifestEntry);
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

function repositoryPath(root, path) {
  return relative(root, path).split(sep).join("/");
}
async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const isCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const summary = (await generateManifests()).summary;
  console.log(
    `Generated manifests: ${summary.surveyCount} surveys, `
      + `${summary.resultCount} results, ${summary.customerCount} customers.`,
  );
}
