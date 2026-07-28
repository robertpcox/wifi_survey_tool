import { definitionCreatorTemplate } from "./template.mjs";
import { closeCreatorMapChoice, showCreatorMapChoice } from "./map-choice.mjs";
import { renderCreatorCoverage, renderCreatorRoute, renderCreatorStops }
  from "./view-render.mjs";
export function createDefinitionCreatorView(root) {
  root.innerHTML = definitionCreatorTemplate();
  const find = selector => root.querySelector(selector);
  const field = name => find(`[data-field="${name}"]`);
  let mapContext = null;
  function readFields() {
    const entries = [...root.querySelectorAll("[data-field]")].map(element => [
        element.dataset.field,
        element.type === "checkbox" ? element.checked : element.value,
      ]);
    return {
      ...Object.fromEntries(entries),
      _mapContext: mapContext ? structuredClone(mapContext) : null,
    };
  }
  function writeFields(values) {
    for (const [name, value] of Object.entries(values)) {
      const element = field(name);
      if (!element) continue;
      if (element.type === "checkbox") element.checked = Boolean(value);
      else element.value = value ?? "";
    }
  }
  function setPlanLocked(locked) {
    const plan = find("[data-plan-fields]");
    for (const element of plan.querySelectorAll("input, select")) {
      element.disabled = locked;
    }
    const button = find('[data-action="lock-plan"]');
    button.disabled = false;
    button.textContent = locked ? "Change checkpoint plan" : "Lock checkpoint plan";
    find("[data-stop-fields]").disabled = !locked;
  }
  function setEngaged(engaged) {
    for (const fieldset of root.querySelectorAll("[data-requires-engagement]")) {
      fieldset.disabled = !engaged;
    }
    for (const button of root.querySelectorAll("[data-requires-engagement-action]")) {
      button.disabled = !engaged;
    }
    const panel = find("[data-launch-panel]");
    panel.disabled = engaged;
    panel.hidden = engaged;
    const summary = find("[data-campus-summary]");
    summary.hidden = !engaged;
    if (engaged) {
      const values = readFields();
      summary.textContent = `${values.customerName} · ${values.campusName} `
        + `(campus ${values.campusId})`;
    }
  }
  function selectStop(stop, index) {
    mapContext = stop?._mapContext
      ? structuredClone(stop._mapContext)
      : null;
    if (stop) {
      writeFields({
        stopName: stop.name,
        stopLng: stop.lng,
        stopLat: stop.lat,
        stopZ: stop.z,
        locationType: stop.locationType,
      });
    }
    const adjust = find('[data-action="adjust-stop"]');
    adjust.disabled = index < 0;
    adjust.dataset.index = index < 0 ? "" : String(index);
    if (!stop) closeCreatorMapChoice(find);
  }
  function showWarning(selector, message, textSelector = selector) {
    const warning = find(selector);
    warning.hidden = !message;
    find(textSelector).textContent = message ?? "";
  }

  function setStatus(message, kind = "") {
    const status = find("[data-creator-status]");
    status.textContent = message;
    status.dataset.kind = kind;
  }

  function onAction(handler) {
    const listener = event => {
      const button = event.target.closest?.("[data-action]");
      if (button) handler(button.dataset.action, button);
    };
    root.addEventListener("click", listener);
    return () => root.removeEventListener("click", listener);
  }

  return {
    clearMapSelection() {
      mapContext = null;
      closeCreatorMapChoice(find);
    },
    chooseImport: () => find("[data-definition-file]").click(),
    importFile: () => find("[data-definition-file]").files?.[0] ?? null,
    onAction,
    onImport: handler => {
      const input = find("[data-definition-file]");
      input.addEventListener("change", handler);
      return () => input.removeEventListener("change", handler);
    },
    readFields,
    renderCoverage: coverage => renderCreatorCoverage(find, coverage),
    renderRoute: (stops, route) => renderCreatorRoute(find, stops, route),
    renderStops: (stops, index) => renderCreatorStops(find, stops, index),
    selectStop,
    setPlanLocked,
    setEngaged,
    setRouteMode: message => { find("[data-route-mode]").textContent = message; },
    setStatus,
    showMapChoice: value => showCreatorMapChoice(find, value),
    showGpsWarning: message => showWarning("[data-gps-warning]", message),
    showShortWarning: message => showWarning(
      "[data-short-warning]",
      message,
      "[data-short-warning-text]",
    ),
    takeMapAccess() {
      const input = find("[data-engage-access]");
      const value = input.value.trim();
      input.value = "";
      return value;
    },
    writeMapSelection(values, context) {
      mapContext = context ? structuredClone(context) : null;
      writeFields(values);
    },
    closeMapChoice: () => closeCreatorMapChoice(find),
    writeFields,
  };
}
