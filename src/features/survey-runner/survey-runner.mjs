import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { createMazeMapCloudSource } from "../../adapters/positioning/mazemap-cloud-v3.mjs";
import { createActiveRunner } from "./active-run.mjs";
import { createRunnerFormView } from "./form-view.mjs";
import { runRunnerPreflight } from "./preflight.mjs";
import { downloadRunnerResult } from "./result-download.mjs";
import { validateRunnerResultFile } from "./result-upload.mjs";
import { createRunnerRunView } from "./run-view.mjs";
import { createRunnerSetup } from "./setup.mjs";

export function mountSurveyRunner(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const credentials = options.credentials ?? createMemoryCredentialStore();
  const formView = options.formView ?? createRunnerFormView(documentRef);
  const runView = options.runView ?? createRunnerRunView(documentRef);
  const mapAdapter = options.mapAdapter
    ?? createMazeMapAdapter({ container: "runner-map" });
  const source = options.source ?? createMazeMapCloudSource(options);
  const nowDate = options.nowDate ?? (() => new Date());
  const state = {
    surveys: [],
    definition: null,
    entry: null,
    preflight: null,
    polls: [],
    activeRun: null,
    lastResult: null,
    busy: false,
  };
  const setup = createRunnerSetup({
    state,
    formView,
    runView,
    credentials,
    mapAdapter,
    source,
    runtime: options,
  });

  async function preflight() {
    if (!setup.entryComplete() || state.busy) return;
    state.busy = true;
    setup.updateActions();
    formView.setStatus("Checking map and positioning source…");
    try {
      const result = await runRunnerPreflight({
        definition: state.definition,
        entry: state.entry,
        credentials,
        mapAdapter,
        pollLoop: setup.pollLoop,
        nowMs: () => nowDate().getTime(),
      });
      state.preflight = result.outcome;
      formView.renderPreflight(result.outcome, result.sample);
      formView.setStatus(
        `${result.outcome.verdict.toUpperCase()} preflight.`,
        result.outcome.verdict,
      );
    } catch (error) {
      formView.setStatus(error?.message || String(error), "red");
    } finally {
      state.busy = false;
      setup.updateActions();
    }
  }

  function start(overridden = false) {
    if (!state.preflight || !setup.entryComplete()) return;
    if (!overridden && state.preflight.verdict !== "green") return;
    if (overridden && !formView.readValues().override) return;
    state.preflight = {
      ...state.preflight,
      acknowledged: overridden,
    };
    state.activeRun = createActiveRunner({
      definition: state.definition,
      pollLoop: setup.pollLoop,
      mapAdapter,
      nowDate,
      setTimer: options.setTimer,
      clearTimer: options.clearTimer,
      onRender: run => runView.renderRun(run),
      onFinish: run => {
        formView.setRunning(false);
        mapAdapter.resizeMapSoon?.();
        runView.showFinish(run.completionStatus);
      },
    });
    formView.setRunning(true);
    mapAdapter.resizeMapSoon?.();
    state.activeRun.start();
  }

  function download() {
    if (!state.activeRun?.state.completionStatus) return null;
    state.lastResult = downloadRunnerResult({
      definition: state.definition,
      entry: state.entry,
      preflight: state.preflight,
      polls: state.polls,
      run: state.activeRun.state,
      operatorComment: runView.comment(),
      nowDate,
      createId: options.createId ?? (() => globalThis.crypto.randomUUID()),
      downloadFile: options.downloadFile,
      documentRef,
    });
    return state.lastResult;
  }

  const actions = {
    checkIn: () => state.activeRun?.checkIn(),
    download,
    entryChanged: setup.entryChanged,
    go: () => start(false),
    overrideGo: () => start(true),
    preflight,
    selectSurvey: setup.selectSurvey,
    stop: () => state.activeRun?.stop(),
    async validateFile(event) {
      const file = event?.target?.files?.[0];
      if (file) runView.showValidation(await validateRunnerResultFile(file));
    },
  };
  formView.bind(actions);
  runView.bind(actions);
  const ready = setup.initialize().catch(error => {
    formView.setStatus(error?.message || String(error), "red");
    throw error;
  });
  return Object.freeze({ actions, credentials, ready, state });
}
