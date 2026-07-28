import { validateSurveyDefinitionV3 } from "../../domain/survey-definition-v3.mjs";

const ROOT_URL = new URL("../../../", import.meta.url);

export async function loadRunnerManifest(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const rootUrl = options.rootUrl ?? ROOT_URL;
  const url = new URL("data/manifests/survey-manifest.v3.json", rootUrl);
  const response = await fetchImpl(url);
  if (!response.ok) throw new Error(`Survey list failed with HTTP ${response.status}`);
  const manifest = await response.json();
  if (manifest?.schemaVersion !== 3 || !Array.isArray(manifest?.surveys)) {
    throw new Error("Survey list is not a v3 manifest");
  }
  return manifest;
}

export async function loadRunnerDefinition(entry, options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const rootUrl = options.rootUrl ?? ROOT_URL;
  const response = await fetchImpl(new URL(entry.path, rootUrl));
  if (!response.ok) throw new Error(`Survey failed with HTTP ${response.status}`);
  const definition = await response.json();
  const result = validateSurveyDefinitionV3(definition);
  if (!result.valid) {
    throw new Error(`Survey definition is invalid: ${result.errors.join("; ")}`);
  }
  return definition;
}
