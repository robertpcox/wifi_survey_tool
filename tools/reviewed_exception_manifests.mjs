// FEATURE:      Reviewed exception manifest generation
// SURFACE:      loadReviewedExceptions(root, resultEntries)
// WHY TOGETHER: Sidecar file loading and source-result validation form one build boundary.
// STATE:        None
// RULES:        Generated projections exist only after every evidence reference validates.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { validateReviewedExceptionsV3 } from "../src/domain/reviewed-exceptions-v3.mjs";

export async function loadReviewedExceptions(root, results) {
  const path = resolve(root, "data/exceptions/reviewed-exceptions.v3.json");
  const sidecar = await readFile(path, "utf8")
    .then(JSON.parse)
    .catch(error => {
      if (error.code === "ENOENT") return { schemaVersion: 3, exceptions: [] };
      throw error;
    });
  const sources = new Map();
  for (const entry of results) {
    sources.set(
      entry.resultId,
      JSON.parse(await readFile(resolve(root, entry.path), "utf8")),
    );
  }
  const validation = validateReviewedExceptionsV3(sidecar, sources);
  if (!validation.valid) {
    throw new Error(
      `data/exceptions/reviewed-exceptions.v3.json:\n${validation.errors.join("\n")}`,
    );
  }
  return {
    schemaVersion: 3,
    exceptions: [...sidecar.exceptions]
      .sort((left, right) => left.id.localeCompare(right.id)),
  };
}
