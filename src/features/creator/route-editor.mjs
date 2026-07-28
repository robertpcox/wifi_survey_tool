import { getPoiAt } from "../../adapters/map/routing.mjs";
import { normalizeStop } from "../../domain/route-model.mjs";
import {
  outdoorsStop,
  poiToStop,
  pointToStop,
} from "../../domain/stop-targets.mjs";
import { createStopInput } from "./stop-input.mjs";

export function createRouteEditor(options) {
  const {
    routeState,
    view,
    mapAdapter,
    Mazemap,
    isRouteEditingBlocked,
    onRouteChanged,
  } = options;
  let pendingTargetChoice = null;

  function invalidateBuiltRoute(reason) {
    routeState.buildVersion++;
    routeState.legs = [];
    routeState.waypoints = [];
    view.setRouteInfo("");
    view.drawRoute(routeState.legs);
    view.drawWaypoints(routeState.waypoints);
    onRouteChanged?.(routeState, reason);
  }

  function renderEditedStops(reason) {
    invalidateBuiltRoute(reason);
    view.renderStops(routeState.stops);
    view.drawStops(routeState.stops);
  }

  function addRouteStop(stop) {
    routeState.stops.push(normalizeStop(stop, routeState.stops.length));
    renderEditedStops("stop-added");
  }

  async function onMapClick(event) {
    if (!mapAdapter?.ready || isRouteEditingBlocked?.()) return;
    const z = mapAdapter.getMapZLevel?.() ?? mapAdapter.currentZLevel ?? 1;
    const { lng, lat } = event.lngLat;
    let poiStop = null;
    try {
      const poi = await getPoiAt(Mazemap, lng, lat, z);
      if (poi) poiStop = poiToStop(poi);
    } catch {}
    const pointStop = pointToStop(lng, lat, z, poiStop);
    if (poiStop) {
      pendingTargetChoice = { point: pointStop, poi: poiStop };
      view.showTargetChoice(pointStop, poiStop);
    } else {
      const outdoors = outdoorsStop(pointStop);
      pendingTargetChoice = { point: pointStop, outdoors };
      view.showLocationChoice(pointStop);
    }
  }

  function chooseMapTarget(type) {
    const stop = pendingTargetChoice?.[type];
    if (!stop) return;
    closeTargetChoice();
    addRouteStop(stop);
    if (type === "outdoors") {
      view.setStatus("ok", "Added exact outdoor point");
    } else if (type === "point" && stop.poiName) {
      view.setStatus("ok", `Added exact point in “${stop.poiName}”`);
    } else if (type === "point") {
      view.setStatus("ok", "Added exact point with unknown POI context");
    } else {
      view.setStatus("ok", `Added POI centre “${stop.label}”`);
    }
  }

  function closeTargetChoice() {
    pendingTargetChoice = null;
    view.closeTargetChoice();
  }

  const { addStopFromInput } = createStopInput({
    Mazemap,
    view,
    addRouteStop,
  });

  function moveStop(index, direction) {
    const otherIndex = index + direction;
    if (otherIndex < 0 || otherIndex >= routeState.stops.length) return;
    [routeState.stops[index], routeState.stops[otherIndex]] =
      [routeState.stops[otherIndex], routeState.stops[index]];
    renderEditedStops("stop-moved");
  }

  function removeStop(index) {
    routeState.stops.splice(index, 1);
    renderEditedStops("stop-removed");
  }

  function clearStops() {
    closeTargetChoice();
    routeState.stops = [];
    renderEditedStops("stops-cleared");
  }

  function applyRoute(stops, name, incrementSelection = true) {
    routeState.stops = stops;
    if (incrementSelection) routeState.selectionVersion++;
    view.setRouteName(name);
    renderEditedStops("route-loaded");
  }

  function clearRouteForLoad() {
    closeTargetChoice();
    routeState.stops = [];
    routeState.selectionVersion = 0;
    view.setRouteName("");
    renderEditedStops("route-load-cleared");
  }

  return {
    actions: {
      addStopFromInput,
      chooseMapTarget,
      clearStops,
      closeTargetChoice,
      moveStop,
      removeStop,
    },
    addRouteStop,
    applyRoute,
    clearRouteForLoad,
    invalidateBuiltRoute,
    onMapClick,
  };
}
