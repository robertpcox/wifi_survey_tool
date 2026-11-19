// FEATURE:      Runner setup initialisation
// SURFACE:      initializeRunnerSetup(options)
// WHY TOGETHER: Manifest load, share-link selection, and first status form one boot step.
// STATE:        Mutates caller-owned Runner state surveys
// RULES:        A requested survey id must exist; customer/campus links open the dynamic survey.
// PROVENANCE:   Run-from-file survey definition request

import { loadRunnerManifest, surveyIdFromUrl } from "./loader.mjs";
import { DYNAMIC_SURVEY_ID } from "./runner-mode.mjs";

export async function initializeRunnerSetup(options) {
  const { state, formView, runtime, selectSurvey, site } = options;
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
  const selectedId = !requestedId && site?.requestedFromUrl
    ? DYNAMIC_SURVEY_ID
    : selected.surveyId;
  formView.populateSurveys(state.surveys, selectedId);
  await selectSurvey({ target: { value: selectedId } });
  formView.setStatus(selectedId === DYNAMIC_SURVEY_ID
    ? "Dynamic room survey loaded. Check the customer and campus, then complete the entry form."
    : "Survey loaded. Complete the entry form.", "ok");
  return state;
}
