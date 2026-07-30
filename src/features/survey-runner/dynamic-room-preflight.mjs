// FEATURE:      Dynamic room Runner preflight orchestration
// SURFACE:      runDynamicRoomPreflight(options)
// WHY TOGETHER: Route-free map launch and the first positioning sample form one gate.
// STATE:        Reads the selected site template without drawing its authored route
// RULES:        Dynamic capture checks readiness/freshness, never template-route proximity.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { evaluateDynamicRoomPreflight }
  from "../../domain/dynamic-room-preflight-v3.mjs";
import { drawRunnerSelection } from "./setup-map.mjs";

export async function runDynamicRoomPreflight(options) {
  const {
    definition,
    credentials,
    mapAdapter,
    pollLoop,
    nowMs,
  } = options;
  let mapReady = false;
  let mapError = null;
  try {
    await mapAdapter.launch(
      credentials.read("mapAccess"),
      options.onMapClick ?? null,
      { campusId: definition.meta.campusId },
    );
    if (String(mapAdapter.campusId) !== String(definition.meta.campusId)) {
      throw new Error("the loaded map campus does not match this survey");
    }
    drawRunnerSelection(mapAdapter, definition, "dynamic-room");
    mapReady = true;
  } catch (error) {
    mapError = error?.message || String(error);
  }
  const sourceReady = typeof pollLoop?.sampleOnce === "function";
  const sample = sourceReady
    ? await pollLoop.sampleOnce("preflight")
    : null;
  const outcome = evaluateDynamicRoomPreflight({
    sample,
    mapReady,
    mapError,
    sourceReady,
    sourceError: sourceReady ? null : "the Runner poll loop is unavailable",
    nowMs: nowMs(),
    pollIntervalMs: definition.meta.sourceConfig.pollIntervalMs,
  });
  return { outcome, sample, mapReady, mapError };
}
