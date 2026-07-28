import { fetchLegGeoJSON } from "../../adapters/map/routing.mjs";
import { generateCheckpoints } from "../../domain/checkpoints.mjs";
import { pathLength } from "../../domain/geometry.mjs";
import { ROUTE_BUILD_CONCURRENCY } from "../../domain/route-contract.mjs";
import { alphaTag } from "../../domain/route-model.mjs";
import { extractPath } from "../../domain/route-path.mjs";
import { sleep } from "../../shared/time.mjs";

export function createRouteBuilder(options) {
  const {
    routeState,
    view,
    Mazemap,
    onRouteChanged,
  } = options;

  async function buildRoute() {
    if (routeState.stops.length < 2) {
      view.setStatus("err", "Need at least 2 stops to build a route");
      return false;
    }
    const buildVersion = ++routeState.buildVersion;
    const stops = routeState.stops.map(stop => ({
      ...stop,
      poi: stop.poi ? { ...stop.poi } : null,
    }));
    const legCount = stops.length - 1;
    const builtLegs = new Array(legCount);
    let nextLegIndex = 0;
    let completedLegs = 0;
    view.setStatus("polling", "Building route…");

    async function routeWorker() {
      while (nextLegIndex < legCount) {
        const legIndex = nextLegIndex++;
        const from = stops[legIndex];
        const to = stops[legIndex + 1];
        let leg = directLeg(legIndex, from, to);
        try {
          const geojson = await fetchLegGeoJSON(
            Mazemap,
            from,
            to,
            view.collectionTag(),
          );
          if (buildVersion !== routeState.buildVersion) return;
          const coords = extractPath(geojson, from, to);
          if (coords.length >= 2) {
            leg = routeLeg(legIndex, coords);
          }
        } catch (error) {
          console.warn(
            `Leg ${legIndex} routing failed, using straight line:`,
            error,
          );
        }
        if (buildVersion !== routeState.buildVersion) return false;
        leg.distanceM = pathLength(leg.coords);
        builtLegs[legIndex] = leg;
        completedLegs++;
        const fromTag = from.tag || alphaTag(legIndex);
        const toTag = to.tag || alphaTag(legIndex + 1);
        view.setStatus(
          "polling",
          `Built ${completedLegs}/${legCount} legs (${fromTag} → ${toTag})…`,
        );
        await sleep(0);
      }
    }

    const workerCount = Math.min(ROUTE_BUILD_CONCURRENCY, legCount);
    const workers = Array.from({ length: workerCount }, () => routeWorker());
    await Promise.all(workers);
    if (buildVersion !== routeState.buildVersion) return false;
    routeState.legs = builtLegs;
    routeState.waypoints = generateCheckpoints(
      stops,
      builtLegs,
      view.spacing(),
    );
    renderBuiltRoute();
    onRouteChanged?.(routeState, "route-built");
    return true;
  }

  function renderBuiltRoute() {
    view.drawRoute(routeState.legs);
    view.drawStops(routeState.stops);
    view.drawWaypoints(routeState.waypoints);
    const total = routeState.legs.reduce(
      (sum, leg) => sum + leg.distanceM,
      0,
    );
    const directCount = routeState.legs
      .filter(leg => leg.mode === "direct").length;
    const fallback = directCount
      ? ` — ${directCount} leg(s) fell back to a straight line`
      : "";
    view.setRouteInfo(
      `${routeState.legs.length} legs, ${Math.round(total)} m, `
        + `${routeState.waypoints.length} check-in points${fallback}`,
    );
    view.setStatus(
      "ok",
      `Route built: ${routeState.waypoints.length} check-in points `
        + `over ${Math.round(total)} m`,
    );
    view.collapseMobileConfig();
  }

  return { buildRoute };
}

function directLeg(index, from, to) {
  return {
    fromIdx: index,
    toIdx: index + 1,
    mode: "direct",
    coords: [
      { lng: from.lng, lat: from.lat, z: from.z },
      { lng: to.lng, lat: to.lat, z: to.z },
    ],
  };
}

function routeLeg(index, coords) {
  return {
    fromIdx: index,
    toIdx: index + 1,
    mode: "route",
    coords,
  };
}
