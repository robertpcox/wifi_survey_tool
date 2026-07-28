import {
  normalizeRunnerEntry,
  runnerEntryIssues,
  syncRunnerCredentials,
} from "./entry.mjs";
import {
  loadRunnerDefinition,
  loadRunnerManifest,
} from "./loader.mjs";
import { createRunnerPollLoop } from "./poll-loop.mjs";
import { createPreflightPollLoopOptions } from "./preflight.mjs";

export function createRunnerSetup(options) {
  const {
    state,
    formView,
    runView,
    credentials,
    mapAdapter,
    source,
    runtime,
  } = options;
  let pollLoop = null;

  function entryChanged() {
    const values = formView.readValues();
    syncRunnerCredentials(values, credentials);
    state.entry = normalizeRunnerEntry(values);
    if (!state.activeRun) state.preflight = null;
    updateActions();
  }

  async function selectSurvey(event) {
    const id = event?.target?.value || formView.selectedSurveyId();
    const entry = state.surveys.find(survey => survey.surveyId === id);
    if (!entry) return;
    state.definition = await (runtime.loadDefinition ?? loadRunnerDefinition)(
      entry,
      runtime,
    );
    state.polls = [];
    state.preflight = null;
    state.activeRun = null;
    formView.setRunning(false);
    formView.showDefinition(state.definition);
    entryChanged();
    pollLoop = createPollLoop();
  }

  function createPollLoop() {
    return createRunnerPollLoop(createPreflightPollLoopOptions({
      definition: state.definition,
      entry: () => state.entry,
      credentials,
      source,
      onSample(sample) {
        state.polls.push(sample);
        mapAdapter.drawPositionTrail?.(state.polls);
        runView.renderSource(sample, state.polls.length);
      },
      setTimer: runtime.setTimer,
      clearTimer: runtime.clearTimer,
    }));
  }

  function entryComplete() {
    if (!state.definition) return false;
    return runnerEntryIssues(
      formView.readValues(),
      credentials,
      state.definition.meta.credentialRequirements,
    ).length === 0;
  }

  function updateActions() {
    formView.setActions({
      entryComplete: entryComplete(),
      preflight: state.preflight,
      busy: state.busy,
    });
  }

  async function initialize() {
    const manifest = await (runtime.loadManifest ?? loadRunnerManifest)(runtime);
    state.surveys = manifest.surveys;
    if (!state.surveys.length) throw new Error("No surveys are available");
    formView.populateSurveys(state.surveys);
    await selectSurvey({ target: { value: state.surveys[0].surveyId } });
    formView.setStatus("Survey loaded. Complete the entry form.", "ok");
    return state;
  }

  return Object.freeze({
    entryChanged,
    entryComplete,
    initialize,
    get pollLoop() { return pollLoop; },
    selectSurvey,
    updateActions,
  });
}
