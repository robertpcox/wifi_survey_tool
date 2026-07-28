import { tagOf, stopTargetTitle } from "../../domain/stop-targets.mjs";
import { esc } from "../../shared/format.mjs";

export function createCreatorView(documentRef, mapAdapter, statusCallback) {
  const element = id => documentRef.getElementById(id);

  function setStatus(type, text) {
    if (statusCallback) {
      statusCallback(type, text);
      return;
    }
    const status = element("statusText");
    status.textContent = text;
    status.style.color = type === "err" ? "#d92d20" : "#667085";
  }

  function renderStops(stops) {
    const list = element("stopList");
    if (!stops.length) {
      list.innerHTML = '<div class="hint">No stops yet.</div>';
      return;
    }
    list.innerHTML = stops.map((stop, index) => {
      const kind = stop.targetType === "poi" ? "POI centre" : "Point";
      return `
        <div class="stop-item">
          <span class="idx">${esc(tagOf(stops, index))}</span>
          <span class="nm" title="${esc(stop.label)}">${esc(stop.label)}</span>
          <span class="kind" title="${esc(stopTargetTitle(stop))}">${kind}</span>
          <span class="z">z${stop.z}</span>
          <button title="Move up" onclick="moveStop(${index},-1)">▲</button>
          <button title="Move down" onclick="moveStop(${index},1)">▼</button>
          <button title="Remove" onclick="removeStop(${index})">✕</button>
        </div>`;
    }).join("");
  }

  function showTargetChoice(pointStop, poiStop) {
    element("targetPointTitle").textContent = "Use clicked point";
    element("targetPoiOption").hidden = false;
    element("targetOutdoorsOption").hidden = true;
    element("targetChoiceCopy").textContent =
      `This click is inside “${poiStop.label}”. Which location should routing use?`;
    element("targetPointSummary").textContent =
      `${coordinates(pointStop)} — keeps “${poiStop.label}” as context`;
    element("targetPoiSummary").textContent =
      `${coordinates(poiStop)} — routes to POI ${poiStop.poiId ?? "centre"}`;
    element("targetChoice").hidden = false;
    setStatus("", "Choose the clicked point or the POI centre");
  }

  function showLocationChoice(pointStop) {
    element("targetPointTitle").textContent = "Keep POI context unknown";
    element("targetPoiOption").hidden = true;
    element("targetOutdoorsOption").hidden = false;
    element("targetChoiceCopy").textContent =
      "No POI was found under this click. Mark it as outdoors only if you know it is outside.";
    element("targetPointSummary").textContent =
      `${coordinates(pointStop)} — stores POI ID and name as null`;
    element("targetChoice").hidden = false;
    setStatus("", "Choose unknown POI context or mark this point as outdoors");
  }

  function refreshSavedRoutes(serverRoutes, localRoutes, selectedKey) {
    const select = element("savedRoutes");
    const localNames = Object.keys(localRoutes).sort((a, b) => a.localeCompare(b));
    const groups = [];
    if (serverRoutes.length) groups.push(serverRouteOptions(serverRoutes));
    if (localNames.length) groups.push(localRouteOptions(localNames));
    select.innerHTML = groups.length
      ? `<option value="">— select a test route —</option>${groups.join("")}`
      : "<option value=''>— no routes available —</option>";
    if (selectedKey) select.value = selectedKey;
  }

  function collapseMobileConfig() {
    const windowRef = documentRef.defaultView ?? globalThis.window;
    if (!windowRef?.matchMedia("(max-width: 700px)").matches) return;
    documentRef.querySelector("details.config").open = false;
    mapAdapter?.resizeMapSoon?.();
  }

  return {
    closeTargetChoice: () => {
      element("targetChoice").hidden = true;
    },
    collapseMobileConfig,
    collectionTag: () => element("collectionTag").value.trim(),
    drawRoute: legs => mapAdapter?.drawRoute?.(legs),
    drawStops: stops => mapAdapter?.drawStops?.(stops),
    drawWaypoints: waypoints => mapAdapter?.drawWaypoints?.(waypoints),
    importInput: () => element("routeFile"),
    refreshSavedRoutes,
    renderStops,
    routeName: () => element("routeName").value.trim(),
    selectedRoute: () => element("savedRoutes").value,
    setRouteInfo: text => {
      element("routeInfo").textContent = text;
    },
    setRouteLoadBusy: busy => {
      const button = element("loadRouteBtn");
      button.disabled = busy;
      button.textContent = busy ? "Loading…" : "Load";
    },
    setRouteName: name => {
      element("routeName").value = name;
    },
    setStatus,
    showLocationChoice,
    showTargetChoice,
    spacing: () => Number(element("wpSpacing").value),
    stopInput: () => element("addPoiId"),
  };
}

function coordinates(stop) {
  return `${stop.lat.toFixed(6)}, ${stop.lng.toFixed(6)}, z${stop.z}`;
}

function serverRouteOptions(routes) {
  const options = routes.map((route, index) =>
    `<option value="server:${index}">${esc(route.name)}`
      + `${route.floor ? ` · ${esc(route.floor)}` : ""}</option>`);
  return `<optgroup label="Server routes">${options.join("")}</optgroup>`;
}

function localRouteOptions(names) {
  const options = names.map(name =>
    `<option value="local:${esc(name)}">${esc(name)}</option>`);
  return `<optgroup label="Saved in this browser">${options.join("")}</optgroup>`;
}
