// FEATURE:      Dynamic room Runner capture view
// SURFACE:      createDynamicRoomView(documentRef)
// WHY TOGETHER: Live point choice, dwell extension, finalisation, and paired exports form one panel.
// STATE:        tap-point, pending, walking, dwelling, finalising, or completed
// RULES:        This view emits intent only; map clicks, polling, routing, and export stay external.
// PROVENANCE:   Ad-hoc room survey field workflow

import { ensureDynamicRoomMarkup, dynamicRoomStatusText } from "./dynamic-room-view-markup.mjs";
export const DYNAMIC_ROOM_SELECTORS = Object.freeze({
  panel: "[data-dynamic-room-panel]",
  status: "[data-dynamic-room-status]",
  dwellRemaining: "[data-dynamic-room-dwell]",
  exports: "[data-dynamic-room-exports]",
  checkIn: '[data-action="dynamic-check-in"]',
  dwell: '[data-action="dynamic-dwell"]',
  extendDwell: '[data-action="dynamic-extend-dwell"]',
  finish: '[data-action="dynamic-finish"]',
  back: '[data-action="back-checkpoint"]',
  retry: '[data-action="dynamic-retry"]',
  downloadDefinition: '[data-action="dynamic-download-definition"]',
  downloadResult: '[data-action="dynamic-download-result"]',
  clear: '[data-action="dynamic-clear"]',
  stop: '[data-action="stop"]',
  stopDialog: "[data-stop-dialog]",
});
const PHASES = new Set(
  ["tap-point", "pending", "walking", "dwelling", "finalising", "completed"]);

export function dynamicRoomAcceptsPoint(phase) {
  return phase === "tap-point" || phase === "walking";
}

export function createDynamicRoomView(documentRef) {
  if (typeof documentRef?.querySelector !== "function") {
    return Object.freeze({
      acceptsMapPoint: () => false,
      bind() {},
      hide() {},
      render() {},
    });
  }
  const find = selector => documentRef.querySelector(selector);
  ensureDynamicRoomMarkup(find, DYNAMIC_ROOM_SELECTORS.panel);
  let currentPhase = "tap-point";

  function render(state = {}) {
    const phase = state.phase ?? "tap-point";
    if (!PHASES.has(phase)) throw new TypeError(`Unknown dynamic room phase: ${phase}`);
    currentPhase = phase;
    const panel = find(DYNAMIC_ROOM_SELECTORS.panel);
    if (!panel) return;
    const finalising = phase === "finalising";
    panel.hidden = false;
    panel.dataset.phase = phase;
    panel.dataset.acceptsPoint = String(dynamicRoomAcceptsPoint(phase));
    panel.setAttribute("aria-busy", String(finalising || Boolean(state.busy)));
    const root = find("[data-run-panel]");
    if (root) {
      root.hidden = false;
      root.dataset.dynamicRoomActive = "true";
    }
    setText(find, DYNAMIC_ROOM_SELECTORS.status, dynamicRoomStatusText(state));
    const back = find(DYNAMIC_ROOM_SELECTORS.back);
    if (back) back.disabled = !state.canBack;
    renderDwell(find, phase, state.dwellRemainingSeconds);
    renderActions(find, phase, state);
  }

  return Object.freeze({
    acceptsMapPoint: () => dynamicRoomAcceptsPoint(currentPhase),
    bind(handlers) {
      bind(find, DYNAMIC_ROOM_SELECTORS.checkIn, handlers.checkIn);
      bind(find, DYNAMIC_ROOM_SELECTORS.dwell, handlers.dwell);
      bind(find, DYNAMIC_ROOM_SELECTORS.extendDwell, handlers.extendDwell);
      bind(find, DYNAMIC_ROOM_SELECTORS.finish, handlers.finish);
      bind(find, DYNAMIC_ROOM_SELECTORS.retry, handlers.retry);
      bind(find, DYNAMIC_ROOM_SELECTORS.downloadDefinition, handlers.downloadDefinition);
      bind(find, DYNAMIC_ROOM_SELECTORS.downloadResult, handlers.downloadResult);
      bind(find, DYNAMIC_ROOM_SELECTORS.clear, handlers.clear);
    },
    hide() {
      const panel = find(DYNAMIC_ROOM_SELECTORS.panel);
      if (panel) panel.hidden = true;
      const root = find("[data-run-panel]");
      if (root) root.dataset.dynamicRoomActive = "false";
    },
    render,
  });
}

function renderActions(find, phase, state) {
  const idle = !state.busy;
  setAction(find, DYNAMIC_ROOM_SELECTORS.checkIn, phase === "pending", idle);
  setAction(find, DYNAMIC_ROOM_SELECTORS.dwell, phase === "pending", idle);
  setAction(
    find,
    DYNAMIC_ROOM_SELECTORS.extendDwell,
    phase === "dwelling",
    idle && Number(state.dwellRemainingSeconds) > 0,
  );
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

function renderDwell(find, phase, seconds) {
  const output = find(DYNAMIC_ROOM_SELECTORS.dwellRemaining);
  if (!output) return;
  output.hidden = phase !== "dwelling";
  output.textContent = phase === "dwelling"
    ? `${Math.max(0, Math.ceil(Number(seconds) || 0))} seconds remaining`
    : "";
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

function bind(find, selector, handler) {
  if (typeof handler === "function") find(selector)?.addEventListener("click", handler);
}
