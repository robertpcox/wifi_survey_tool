import { readJsonFile } from "../../adapters/files.mjs";
import { validateSurveyResultV3 } from "../../domain/survey-result-v3.mjs";

export async function validateRunnerResultFile(file) {
  try {
    const result = validateSurveyResultV3(await readJsonFile(file));
    return result.valid
      ? { valid: true, message: "Valid SurveyResultV3 file." }
      : { valid: false, message: result.errors.join("\n") };
  } catch (error) {
    return {
      valid: false,
      message: `Could not read result JSON: ${error?.message || error}`,
    };
  }
}
