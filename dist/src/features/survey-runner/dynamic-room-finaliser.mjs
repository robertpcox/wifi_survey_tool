// FEATURE:      Dynamic room Runner finalisation
// SURFACE:      Finish/retry/abort while routing and polling settle
// WHY TOGETHER: Capture locking, endpoint hold, route completion, and poll stop are one boundary.
// STATE:        Mutates one active dynamic-run state
// RULES:        Finish keeps polling; route failures never fabricate geometry and remain retryable.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  completeDynamicRoomSession,
  dynamicRoomDwellRemainingSeconds,
  requestDynamicRoomFinish,
} from "../../domain/dynamic-room-session-v3.mjs";
import { finaliseDynamicSurvey } from "./dynamic-survey-export.mjs";
import {
  dynamicCaptureSnapshot,
  dynamicDefinitionSeed,
} from "./dynamic-room-run-values.mjs";

export function createDynamicRoomFinaliser(options) {
  const { session, state } = options;
  let disposed = false;

  function finish() {
    if (disposed || state.finalising) return state.finalising || false;
    const at = options.nowIso();
    const transition = requestDynamicRoomFinish(session, at, options.nowMs());
    if (!transition.changed) return false;
    session.events.push({
      type: "endpoint-hold-started",
      at,
      checkpointId: session.checkpoints.at(-1).id,
    });
    state.finaliseStatus = "completed";
    return finalise(false);
  }

  function retry() {
    if (disposed || session.phase !== "finalising" || !state.error) return false;
    return finalise(true);
  }

  function abort() {
    if (disposed || state.completionStatus) return false;
    const at = options.nowIso();
    state.finaliseStatus = "aborted";
    state.completionStatus = "aborted";
    state.stoppedAt = at;
    session.captureLocked = true;
    session.dwell = null;
    session.events.push({ type: "run-aborted", at });
    options.pollLoop.stop();
    session.phase = "completed";
    if (session.stops.length < 2) {
      state.error = "Stopped before two checkpoints; standard V3 files cannot be created.";
      options.onRender();
      options.onFinish?.(null);
      return true;
    }
    state.error = "Survey stopped. Clear now, or wait for the route files.";
    options.onRender();
    void finalise(false);
    return true;
  }

  function finalise(retryFailed) {
    if (state.finalising) return state.finalising;
    if (state.finaliseStatus !== "aborted") state.error = null;
    options.onRender();
    const work = finaliseDynamicSurvey({
      routeAuthor: options.routeAuthor,
      retryFailed,
      definitionInput: dynamicDefinitionSeed(
        options.definition,
        state.startedAt,
      ),
      checkpoints: structuredClone(session.checkpoints),
      markSpacingM: session.markSpacingM,
      captureAfterRoute: captureAfterRoute,
    }, {
      now: options.nowDate,
      cryptoRef: options.cryptoRef,
    });
    state.finalising = work.then(output => {
      if (disposed) return null;
      state.error = null;
      state.export = output;
      state.lastResult = output.result;
      session.phase = "completed";
      options.onFinish?.(output);
      return output;
    }).catch(error => {
      if (!disposed) state.error = error?.message || String(error);
      return null;
    }).finally(() => {
      state.finalising = null;
      if (!disposed) options.onRender();
    });
    return state.finalising;
  }

  async function captureAfterRoute() {
    if (disposed) throw new Error("Dynamic run was cleared");
    if (state.finaliseStatus === "completed") {
      await waitForDwell();
    }
    if (state.finaliseStatus === "completed") {
      const completed = completeDynamicRoomSession(
        session,
        options.nowIso(),
        options.nowMs(),
      );
      if (!completed.changed) {
        throw new Error(`Dynamic completion failed: ${completed.reason}`);
      }
      state.stoppedAt = session.completedAt;
      state.completionStatus = "completed";
      options.pollLoop.stop();
    } else {
      session.phase = "completed";
    }
    return dynamicCaptureSnapshot({
      state,
      session,
      nowIso: options.nowIso,
      operatorComment: options.operatorComment,
      createId: options.createId,
    });
  }

  async function waitForDwell() {
    while (!disposed
        && dynamicRoomDwellRemainingSeconds(session, options.nowMs()) > 0) {
      await new Promise(resolve => options.setTimer(resolve, 250));
    }
    if (disposed) throw new Error("Dynamic run was cleared");
  }

  function dispose() {
    const changed = !disposed;
    disposed = true;
    return changed;
  }
  return Object.freeze({ abort, dispose, finish, retry });
}
