import {
  normalizeRunnerEntry,
  runnerEntryIssues,
  syncRunnerCredentials,
} from "./entry.mjs";
import {
  loadRunnerDefinition,
  loadRunnerManifest,
  surveyIdFromUrl,
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
    drawSelectedRoute();
    entryChanged();
    pollLoop = createPollLoop();
  }

  function drawSelectedRoute() {
    if (!mapAdapter.ready) return;
    if (String(mapAdapter.campusId) !== String(state.definition.meta.campusId)) return;
    mapAdapter.drawRoute?.(state.definition.route.legs);
    mapAdapter.drawStops?.(state.definition.route.stops);
    mapAdapter.drawWaypoints?.(state.definition.route.checkpoints);
    mapAdapter.fitRoute?.(state.definition.route);
    mapAdapter.resizeMapSoon?.();
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
    pollLoop?.stop();
    pollLoop = null;
    state.definition = null;
    state.preflight = null;
    state.polls = [];
    state.activeRun = null;
    state.lastResult = null;
    state.busy = false;
    mapAdapter.drawPositionTrail?.([]);
    mapAdapter.drawRoute?.([]);
    mapAdapter.drawStops?.([]);
    mapAdapter.drawWaypoints?.([]);
    mapAdapter.setActiveLeg?.(null);
    mapAdapter.clearTargetMarker?.();
    formView.setRunning(false);
    formView.resetRouteSelection?.();
    runView.resetSession?.();
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

  async function initialize() {
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

  return Object.freeze({
    entryChanged,
    entryComplete,
    initialize,
    get pollLoop() { return pollLoop; },
    clearCapture,
    selectSurvey,
    updateActions,
  });
}
