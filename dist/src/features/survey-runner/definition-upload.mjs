// FEATURE:      Runner survey-definition upload
// SURFACE:      readRunnerDefinitionFile(file)
// WHY TOGETHER: File reading, schema gating, and V3 validation form one entry gate.
// STATE:        None
// RULES:        Uploaded definitions keep their surveyId and route hash untouched.
// PROVENANCE:   Run-from-file survey definition request

import { readJsonFile } from "../../adapters/files.mjs";
import { validateSurveyDefinitionV3 }
  from "../../domain/survey-definition-v3.mjs";

export async function readRunnerDefinitionFile(file) {
  if (!file) throw new Error("Choose a survey definition file to upload.");
  let definition;
  try {
    definition = await readJsonFile(file);
  } catch (error) {
    throw new Error(
      `Could not read "${file.name}" as JSON: ${error?.message || error}`,
    );
  }
  if (definition?.schemaVersion !== 3) {
    throw new Error(
      `"${file.name}" is not a v3 survey definition `
        + `(schemaVersion ${definition?.schemaVersion ?? "missing"}).`,
    );
  }
  const validation = validateSurveyDefinitionV3(definition);
  if (!validation.valid) {
    throw new Error(
      `"${file.name}" is not a valid survey definition: `
        + validation.errors.join("; "),
    );
  }
  return definition;
}
