// FEATURE:      Dynamic room Runner start
// SURFACE:      startDynamicRoomRunner(options)
// WHY TOGETHER: Route provider, active capture, full-screen map, and paired export share one launch.
// STATE:        Installs the active dynamic run on Runner state
// RULES:        Template geometry stays hidden and only Go starts continuous polling.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { createDynamicRoomRunner } from "./dynamic-room-run.mjs";
import { resolveDynamicRoomRouteProvider }
  from "./dynamic-room-route-provider.mjs";

export function startDynamicRoomRunner(options) {
  const { state, setup, formView, mapAdapter } = options;
  const routeBetween = resolveDynamicRoomRouteProvider({
    mapAdapter,
    routeProvider: options.routeProvider,
  });
  state.activeRun = createDynamicRoomRunner({
    definition: state.definition,
    entry: state.entry,
    preflight: state.preflight,
    polls: state.polls,
    pollLoop: setup.pollLoop,
    mapAdapter,
    routeBetween,
    view: options.dynamicView,
    nowDate: options.nowDate,
    nowMs: options.nowMs,
    setTimer: options.setTimer,
    clearTimer: options.clearTimer,
    createId: options.createId,
    cryptoRef: options.cryptoRef,
    downloadFile: options.downloadFile,
    documentRef: options.documentRef,
    operatorComment: options.runView.comment,
    onFinish(output) {
      state.lastResult = output
        ? { filename: output.files.result.filename, result: output.result }
        : null;
    },
  });
  formView.setRunning(true);
  mapAdapter.resizeMapSoon?.();
  state.activeRun.start();
  return state.activeRun;
}
