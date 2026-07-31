// FEATURE:      Dynamic room Runner action rendering
// SURFACE:      renderDynamicRoomActions(find, phase, state)
// WHY TOGETHER: Phase-driven panel button visibility forms one rendering pass.
// STATE:        None
// RULES:        Hidden actions are disabled; walking check-ins live on the shared run HUD.
// PROVENANCE:   Structured dynamic capture request

import { DYNAMIC_ROOM_SELECTORS } from "./dynamic-room-view-markup.mjs";

export function renderDynamicRoomActions(find, phase, state) {
  const idle = !state.busy;
  const dwelling = phase === "dwelling";
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.continueDwell,
    dwelling,
    idle && Number(state.dwellRemainingSeconds) > 0,
  );
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.extendDwell,
    dwelling,
    idle && Number(state.dwellRemainingSeconds) > 0,
  );
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.finish,
    phase === "walking" || dwelling,
    idle && state.canFinish !== false,
  );
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.retry,
    phase === "finalising" && Boolean(state.retryAvailable),
    idle,
  );
  const completed = phase === "completed";
  const stop = find(DYNAMIC_ROOM_SELECTORS.stop);
  if (stop) { stop.hidden = completed; stop.disabled = completed; }
  const dialog = completed ? find(DYNAMIC_ROOM_SELECTORS.stopDialog) : null;
  if (dialog?.open && typeof dialog.close === "function") dialog.close();
  else if (dialog) dialog.hidden = true;
  const ready = completed && Boolean(state.exportReady);
  const exports = find(DYNAMIC_ROOM_SELECTORS.exports);
  if (exports) exports.hidden = !completed;
  setAction(find, DYNAMIC_ROOM_SELECTORS.downloadDefinition, ready, ready);
  setAction(find, DYNAMIC_ROOM_SELECTORS.downloadResult, ready, ready);
  setAction(find, DYNAMIC_ROOM_SELECTORS.clear, completed, idle);
}

function setAction(find, selector, visible, enabled) {
  const button = find(selector);
  if (!button) return;
  button.hidden = !visible;
  button.disabled = !visible || !enabled;
}
