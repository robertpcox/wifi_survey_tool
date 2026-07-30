// FEATURE:      Dynamic room Runner start
// SURFACE:      startDynamicRoomRunner(options)
// WHY TOGETHER: Route provider, run-level dwell, extra devices, and paired export share one launch.
// STATE:        Installs the active dynamic run on Runner state
// RULES:        Template geometry stays hidden and only Go starts continuous polling.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { createDynamicRoomRunner } from "./dynamic-room-run.mjs";
import {
  combineDynamicPollLoops,
  createDynamicDevicePolling,
} from "./dynamic-device-polling.mjs";
import {
  runnerDynamicDwellSeconds,
  runnerDynamicMarkSpacingM,
  runnerExtraDevices,
} from "./dynamic-room-devices.mjs";
import { resolveDynamicRoomRouteProvider }
  from "./dynamic-room-route-provider.mjs";

export function startDynamicRoomRunner(options) {
  const { state, setup, formView, mapAdapter } = options;
  const routeBetween = resolveDynamicRoomRouteProvider({
    mapAdapter,
    routeProvider: options.routeProvider,
  });
  const devicePolling = createDynamicDevicePolling({
    devices: runnerExtraDevices(state.entry),
    source: options.source,
    definition: state.definition,
    entry: state.entry,
    credentials: options.credentials,
    setTimer: options.setTimer,
    clearTimer: options.clearTimer,
  });
  state.activeRun = createDynamicRoomRunner({
    definition: state.definition,
    entry: state.entry,
    preflight: state.preflight,
    polls: state.polls,
    pollLoop: combineDynamicPollLoops(setup.pollLoop, devicePolling),
    dwellSeconds: runnerDynamicDwellSeconds(state.entry),
    markSpacingM: runnerDynamicMarkSpacingM(state.entry),
    extraDevices: devicePolling?.streams ?? [],
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
