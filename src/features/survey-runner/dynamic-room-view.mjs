// FEATURE:      Dynamic room Runner capture view
// SURFACE:      createDynamicRoomView(documentRef)
// WHY TOGETHER: Live point choice, dwell staging, and paired exports drive one shared HUD.
// STATE:        tap-point, pending, walking, dwelling, finalising, or completed
// RULES:        This view emits intent only; map clicks, polling, routing, and export stay external.
// PROVENANCE:   Ad-hoc room survey field workflow

import {
  DYNAMIC_ROOM_SELECTORS,
  dynamicRoomStatusText,
  ensureDynamicRoomMarkup,
} from "./dynamic-room-view-markup.mjs";
import { renderDynamicRoomActions } from "./dynamic-room-view-actions.mjs";
import {
  renderDynamicRoomHud,
  resetDynamicRoomHud,
} from "./dynamic-room-hud.mjs";

export { DYNAMIC_ROOM_SELECTORS } from "./dynamic-room-view-markup.mjs";
const PHASES = new Set(["tap-point", "pending", "walking", "dwelling", "finalising", "completed"]);

export function dynamicRoomAcceptsPoint(phase) {
  return ["tap-point", "walking", "dwelling"].includes(phase);
}

export function createDynamicRoomView(documentRef) {
  if (typeof documentRef?.querySelector !== "function") {
    return Object.freeze({ acceptsMapPoint: () => false, bind() {}, hide() {}, render() {} });
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
    renderDynamicRoomHud(find, state);
    renderDynamicRoomActions(find, phase, state);
  }

  return Object.freeze({
    acceptsMapPoint: () => dynamicRoomAcceptsPoint(currentPhase),
    bind(handlers) {
      bind(find, DYNAMIC_ROOM_SELECTORS.continueDwell, handlers.continueDwell);
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
      resetDynamicRoomHud(find);
    },
    render,
  });
}

function setText(find, selector, value) {
  const node = find(selector);
  if (node) node.textContent = value;
}

function bind(find, selector, handler) {
  if (typeof handler === "function") find(selector)?.addEventListener("click", handler);
}
