import {
  normalizeRunnerEntry,
  runnerEntryIssues,
  syncRunnerCredentials,
} from "./entry.mjs";
import { loadRunnerDefinition } from "./loader.mjs";
import { readRunnerDefinitionFile } from "./definition-upload.mjs";
import { initializeRunnerSetup } from "./setup-init.mjs";
import { clearRunnerCaptureState } from "./setup-clear.mjs";
import { createRunnerPollLoop } from "./poll-loop.mjs";
import { createPreflightPollLoopOptions } from "./preflight.mjs";
import {
  dynamicTemplateEntry,
  runnerModeForSelection,
} from "./runner-mode.mjs";
import { drawRunnerSelection } from "./setup-map.mjs";

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
    if (state.busy || state.activeRun) return;
    const values = formView.readValues();
    syncRunnerCredentials(values, credentials);
    state.entry = normalizeRunnerEntry(values);
    if (!state.activeRun) state.preflight = null;
    updateActions();
  }

  async function selectSurvey(event) {
    if (state.busy || state.activeRun) return;
    const id = event?.target?.value || formView.selectedSurveyId();
    const mode = runnerModeForSelection(id);
    const entry = mode === "dynamic-room"
      ? dynamicTemplateEntry(state.surveys)
      : state.surveys.find(survey => survey.surveyId === id);
    if (!entry) return;
    const definition = await (runtime.loadDefinition ?? loadRunnerDefinition)(
      entry,
      runtime,
    );
    installDefinition(definition, mode);
  }

  async function selectUploadedDefinition(file) {
    if (state.busy || state.activeRun) return false;
    try {
      const definition = await readRunnerDefinitionFile(file);
      installDefinition(definition, "planned-route");
      formView.setSurveySelection?.("");
      formView.setStatus(
        `Loaded "${definition.meta.surveyName}" from ${file.name}. `
          + "Complete the entry form.",
        "ok",
      );
      return true;
    } catch (error) {
      formView.setStatus(error?.message || String(error), "red");
      return false;
    }
  }

  function installDefinition(definition, mode) {
    state.mode = mode;
    state.definition = definition;
    state.polls = [];
    state.preflight = null;
    state.activeRun = null;
    formView.setRunning(false);
    formView.showDefinition(definition, { dynamic: mode === "dynamic-room" });
    drawRunnerSelection(mapAdapter, definition, mode);
    entryChanged();
    pollLoop = createPollLoop();
  }

  function createPollLoop() {
    return createRunnerPollLoop(createPreflightPollLoopOptions({
      definition: state.definition,
      entry: () => state.entry,
      credentials,
      source,
      onSample(sample, context) {
        state.polls.push(sample);
        mapAdapter.drawPositionTrail?.(state.polls);
        runView.renderSource(sample, state.polls.length);
        runtime.onRunnerSample?.(sample, context);
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

  function clearCapture(message = "Capture cleared. Choose the next survey.") {
    state.activeRun?.dispose?.();
    pollLoop?.stop();
    pollLoop = null;
    clearRunnerCaptureState({ state, mapAdapter, formView, runView });
    updateActions();
    formView.setStatus(message, "ok");
    return true;
  }

  function updateActions() {
    formView.setActions({
      entryComplete: entryComplete(),
      preflight: state.preflight,
      busy: state.busy,
    });
  }

  function initialize() {
    return initializeRunnerSetup({ state, formView, runtime, selectSurvey });
  }

  return Object.freeze({
    entryChanged,
    entryComplete,
    initialize,
    get pollLoop() { return pollLoop; },
    clearCapture,
    selectSurvey,
    selectUploadedDefinition,
    updateActions,
  });
}
