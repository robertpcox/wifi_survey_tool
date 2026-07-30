// FEATURE:      Planned-route Runner start
// SURFACE:      startPlannedRunner(options)
// WHY TOGETHER: Immutable definition progress, map focus, polling, and finish share one launch.
// STATE:        Installs the active planned run on Runner state
// RULES:        Existing planned-route behavior remains unchanged.
// PROVENANCE:   Step 4 Runner extraction for dynamic-room composition

import { createActiveRunner } from "./active-run.mjs";

export function startPlannedRunner(options) {
  const { state, setup, formView, runView, mapAdapter } = options;
  state.activeRun = createActiveRunner({
    definition: state.definition,
    pollLoop: setup.pollLoop,
    mapAdapter,
    currentPosition: () => {
      for (let index = state.polls.length - 1; index >= 0; index--) {
        if (state.polls[index]?.success) return state.polls[index].normalized;
      }
      return null;
    },
    nowDate: options.nowDate,
    nowMs: options.nowMs,
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
  return state.activeRun;
}
