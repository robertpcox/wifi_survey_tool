import { evaluateRunnerPreflight } from "../../domain/runner-preflight-v3.mjs";
import { runnerPositionRequest } from "./entry.mjs";

export async function runRunnerPreflight(options) {
  const {
    definition,
    entry,
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
    mapAdapter.drawRoute?.(definition.route.legs);
    mapAdapter.drawStops?.(definition.route.stops);
    mapAdapter.drawWaypoints?.(definition.route.checkpoints);
    mapAdapter.fitRoute?.(definition.route);
    mapReady = true;
  } catch (error) {
    mapError = error?.message || String(error);
  }
  const sample = await pollLoop.sampleOnce("preflight");
  const outcome = evaluateRunnerPreflight({
    definition,
    sample,
    mapReady,
    mapError,
    nowMs: nowMs(),
  });
  return { outcome, sample, mapReady, mapError };
}

export function createPreflightPollLoopOptions(options) {
  const { definition, entry, credentials } = options;
  return {
    source: options.source,
    intervalMs: definition.meta.sourceConfig.pollIntervalMs,
    request: () => runnerPositionRequest(definition, entry(), credentials),
    onSample: options.onSample,
    setTimer: options.setTimer,
    clearTimer: options.clearTimer,
  };
}
