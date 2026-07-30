// FEATURE:      Dynamic room Runner action rendering
// SURFACE:      renderDynamicRoomActions(find, phase, state), renderDynamicRoomDwell
// WHY TOGETHER: Phase-driven button visibility and labels form one rendering pass.
// STATE:        None
// RULES:        Hidden actions are disabled; marks stay optional and never block arrival.
// PROVENANCE:   Structured dynamic capture request

import {
  DYNAMIC_ROOM_SELECTORS,
  dynamicRoomDwellLabel,
  dynamicRoomMarkLabel,
} from "./dynamic-room-view-markup.mjs";

export function renderDynamicRoomActions(find, phase, state) {
  const idle = !state.busy;
  setAction(find, DYNAMIC_ROOM_SELECTORS.checkIn, phase === "pending", idle);
  setAction(find, DYNAMIC_ROOM_SELECTORS.dwell, phase === "pending", idle);
  setText(find, DYNAMIC_ROOM_SELECTORS.dwell, dynamicRoomDwellLabel(state.dwellSeconds));
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.extendDwell,
    phase === "dwelling",
    idle && Number(state.dwellRemainingSeconds) > 0,
  );
  renderMarkActions(find, phase, state, idle);
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.finish,
    phase === "walking" || phase === "dwelling",
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

export function renderDynamicRoomDwell(find, phase, seconds) {
  const output = find(DYNAMIC_ROOM_SELECTORS.dwellRemaining);
  if (!output) return;
  output.hidden = phase !== "dwelling";
  output.textContent = phase === "dwelling"
    ? `${Math.max(0, Math.ceil(Number(seconds) || 0))} seconds remaining`
    : "";
}

function renderMarkActions(find, phase, state, idle) {
  const active = phase === "pending" && Number(state.marks?.remaining) > 0;
  setAction(find, DYNAMIC_ROOM_SELECTORS.passMark, active, idle);
  setAction(find, DYNAMIC_ROOM_SELECTORS.skipMark, active, idle);
  if (active) {
    setText(find, DYNAMIC_ROOM_SELECTORS.passMark, dynamicRoomMarkLabel(state.marks));
  }
}

function setAction(find, selector, visible, enabled) {
  const button = find(selector);
  if (!button) return;
  button.hidden = !visible;
  button.disabled = !visible || !enabled;
}

function setText(find, selector, value) {
  const node = find(selector);
  if (node) node.textContent = value;
}
