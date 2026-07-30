import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { createMemoryCredentialStore } from "../../adapters/memory-credentials.mjs";
import { createMazeMapCloudSource } from "../../adapters/positioning/mazemap-cloud-v3.mjs";
import { startDynamicRoomRunner } from "./dynamic-room-start.mjs";
import { createDynamicRoomView } from "./dynamic-room-view.mjs";
import { createRunnerFormView } from "./form-view.mjs";
import { startPlannedRunner } from "./planned-run-start.mjs";
import { downloadRunnerResult } from "./result-download.mjs";
import { validateRunnerResultFile } from "./result-upload.mjs";
import { createRunnerRunView } from "./run-view.mjs";
import { createRunnerSetup } from "./setup.mjs";
import { createRunnerNoteController } from "./note-controller.mjs";
import { mountRunnerMap3dToggle } from "./map-3d-toggle.mjs";
import { prepareRunnerStart } from "./runner-start-gate.mjs";
import { performRunnerPreflight } from "./runner-preflight-action.mjs";
export const RUNNER_THREE_D = Object.freeze({ animateWalls: true, show3dAssets: true });
export function mountSurveyRunner(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const credentials = options.credentials ?? createMemoryCredentialStore();
  const formView = options.formView ?? createRunnerFormView(documentRef);
  const runView = options.runView ?? createRunnerRunView(documentRef);
  const dynamicView = options.dynamicView ?? createDynamicRoomView(documentRef);
  const mapAdapter = options.mapAdapter ?? createMazeMapAdapter({ container: "runner-map", floorControl: true, threeD: RUNNER_THREE_D });
  mountRunnerMap3dToggle(documentRef, mapAdapter);
  const source = options.source ?? createMazeMapCloudSource(options);
  const nowDate = options.nowDate ?? (() => new Date());
  const state = {
    surveys: [],
    mode: null,
    definition: null,
    entry: null,
    preflight: null,
    polls: [],
    activeRun: null,
    lastResult: null,
    busy: false,
  };
  const noteController = createRunnerNoteController({ state, runView, mapAdapter });
  const setup = createRunnerSetup({
    state,
    formView,
    runView,
    credentials,
    mapAdapter,
    source,
    runtime: { ...options, onRunnerSample: noteController.handleSample },
  });
  const handleMapClick = event => (
    noteController.handleMapClick(event)
    || state.activeRun?.handleMapClick?.(event)
    || false
  );
  const preflight = () => performRunnerPreflight({
    state, setup, formView, credentials, mapAdapter, nowDate,
    onMapClick: handleMapClick,
  });
  function start(overridden = false) {
    if (!prepareRunnerStart({
      state, setup, formView, noteController,
    }, overridden)) return false;
    const startOptions = {
      ...options, state, setup, formView, runView, dynamicView, mapAdapter,
      source, credentials, nowDate,
      createId: options.createId ?? (() => globalThis.crypto.randomUUID()),
      cryptoRef: options.cryptoRef ?? globalThis.crypto,
      documentRef,
    };
    return state.mode === "dynamic-room"
      ? startDynamicRoomRunner(startOptions)
      : startPlannedRunner(startOptions);
  }
  function download() {
    if (!state.activeRun?.state.completionStatus) return null;
    if (state.mode === "dynamic-room") {
      return state.activeRun.download("result");
    }
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
    const downloaded = state.lastResult;
    setup.clearCapture("Result downloaded. Choose the next survey.");
    return downloaded;
  }
  function clearCapture() {
    if (!state.activeRun?.state.completionStatus) return false;
    const cleared = setup.clearCapture();
    if (cleared) dynamicView.hide();
    return cleared;
  }
  const actions = {
    addNote: noteController.add,
    back: () => state.activeRun?.back(),
    cancelNote: noteController.cancel,
    checkIn: () => state.activeRun?.checkIn(),
    clear: clearCapture,
    clearCapture,
    download,
    downloadDefinition: () => state.activeRun?.download?.("definition"),
    downloadResult: download,
    dwell: () => state.activeRun?.dwell?.(),
    endSession: () => state.activeRun?.endSession(),
    entryChanged: setup.entryChanged,
    extendDwell: () => state.activeRun?.extendDwell?.(),
    finish: () => state.activeRun?.finish?.(),
    go: () => start(false),
    manualNote: noteController.manual,
    noteState: noteController.noteState,
    overrideChanged: setup.updateActions,
    overrideGo: () => start(true),
    passMark: () => state.activeRun?.passMark?.(),
    preflight,
    retry: () => state.activeRun?.retry?.(),
    selectSurvey: setup.selectSurvey,
    skip: () => state.activeRun?.skip(),
    skipMark: () => state.activeRun?.skipMark?.(),
    stop: () => state.activeRun?.stop(),
    async validateFile(event) {
      const file = event?.target?.files?.[0];
      if (file) runView.showValidation(await validateRunnerResultFile(file));
    },
  };
  formView.bind(actions);
  runView.bind(actions);
  dynamicView.bind(actions);
  const ready = setup.initialize().catch(error => {
    formView.setStatus(error?.message || String(error), "red");
    throw error;
  });
  return Object.freeze({ actions, credentials, ready, state });
}
