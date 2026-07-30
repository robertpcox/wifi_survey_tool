// FEATURE:      Runner setup initialisation
// SURFACE:      initializeRunnerSetup(options)
// WHY TOGETHER: Manifest load, share-link selection, and first status form one boot step.
// STATE:        Mutates caller-owned Runner state surveys
// RULES:        A requested survey id must exist or initialisation fails loudly.
// PROVENANCE:   Run-from-file survey definition request

import { loadRunnerManifest, surveyIdFromUrl } from "./loader.mjs";

export async function initializeRunnerSetup(options) {
  const { state, formView, runtime, selectSurvey } = options;
  const manifest = await (runtime.loadManifest ?? loadRunnerManifest)(runtime);
  state.surveys = manifest.surveys;
  if (!state.surveys.length) throw new Error("No surveys are available");
  const requestedId = surveyIdFromUrl(
    runtime.locationRef?.href ?? globalThis.location?.href,
  );
  const selected = requestedId
    ? state.surveys.find(survey => survey.surveyId === requestedId)
    : state.surveys[0];
  if (!selected) {
    throw new Error(`Survey "${requestedId}" is not available`);
  }
  formView.populateSurveys(state.surveys, selected.surveyId);
  await selectSurvey({ target: { value: selected.surveyId } });
  formView.setStatus("Survey loaded. Complete the entry form.", "ok");
  return state;
}
