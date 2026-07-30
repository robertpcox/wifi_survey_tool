// FEATURE:      Runner preflight action
// SURFACE:      performRunnerPreflight(options)
// WHY TOGETHER: Busy gating, mode-specific evaluator, evidence rendering, and status form one action.
// STATE:        Updates selected Runner preflight and action availability
// RULES:        Dynamic mode never evaluates the hidden template route.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { runDynamicRoomPreflight } from "./dynamic-room-preflight.mjs";
import { runRunnerPreflight } from "./preflight.mjs";

export async function performRunnerPreflight(options) {
  const { state, setup, formView } = options;
  if (!setup.entryComplete() || state.busy) return;
  state.busy = true;
  setup.updateActions();
  formView.setStatus("Checking map and positioning source…");
  try {
    const runner = state.mode === "dynamic-room"
      ? runDynamicRoomPreflight
      : runRunnerPreflight;
    const result = await runner({
      definition: state.definition,
      entry: state.entry,
      credentials: options.credentials,
      mapAdapter: options.mapAdapter,
      pollLoop: setup.pollLoop,
      onMapClick: options.onMapClick,
      nowMs: () => options.nowDate().getTime(),
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
