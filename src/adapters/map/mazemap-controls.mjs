import { MAP_STYLE } from "../../domain/route-contract.mjs";
import { bearingTo } from "./camera-bearing.mjs";
import { numericZ } from "./mazemap-runtime.mjs";
const ROUTE_PADDING = { top: 72, right: 48, bottom: 72, left: 48 };
const WAYPOINT_PADDING = { top: 112, right: 40, bottom: 176, left: 40 };
export function createMapControls(state) {
  let targetMarker = null;
  let zWatch = null;
  function getMapZLevel() {
    const map = state.map();
    if (map && typeof map.getZLevel === "function") {
      try {
        return numericZ(map.getZLevel());
      } catch {}
    }
    return numericZ(map?.zLevel) ?? state.currentZ();
  }
  function setMapZLevel(z) {
    const map = state.map();
    if (typeof map?.setZLevel === "function") map.setZLevel(z);
    else if (typeof map?.setZlevel === "function") map.setZlevel(z);
  }
  function startZWatch(onChange) {
    stopZWatch();
    const watch = setInterval(() => {
      const z = getMapZLevel();
      if (z == null || z === state.currentZ()) return;
      state.setCurrentZ(z);
      state.layers()?.applyZStyling();
      onChange?.(z);
    }, 250);
    zWatch = watch;
    return () => {
      clearInterval(watch);
      if (zWatch !== watch) return false;
      zWatch = null;
      return true;
    };
  }
  function stopZWatch() {
    if (zWatch == null) return false;
    clearInterval(zWatch);
    zWatch = null;
    return true;
  }
  function fitRoute(route) {
    const map = state.map();
    const points = routePoints(route?.route ?? route);
    if (!map || !points.length) return false;
    map.stop?.();
    if (points.length === 1) {
      const point = points[0];
      return moveCamera(map, {
        center: [point.lng, point.lat],
        zoom: Math.min(Math.max(safeZoom(map), 18), 19),
        bearing: 0,
        pitch: 0,
        padding: { ...ROUTE_PADDING },
        duration: 350,
      });
    }
    const lngs = points.map(point => point.lng);
    const lats = points.map(point => point.lat);
    if (typeof map.fitBounds !== "function") return false;
    map.fitBounds([
      [Math.min(...lngs), Math.min(...lats)],
      [Math.max(...lngs), Math.max(...lats)],
    ], {
      padding: { ...ROUTE_PADDING },
      maxZoom: 19,
      bearing: 0,
      pitch: 0,
      duration: 350,
    });
    return true;
  }
  function focusWaypoint(waypoint, view = {}) {
    const map = state.map();
    const sdk = state.sdk();
    if (!map || !sdk?.MazeMarker || !finitePoint(waypoint)) return false;
    const sequence = Number.isInteger(waypoint.sequence) ? waypoint.sequence : waypoint.seq;
    clearTargetMarker();
    targetMarker = new sdk.MazeMarker({
      color: MAP_STYLE.waypointCurrent,
      size: 42,
      glyph: Number.isInteger(sequence) ? String(sequence + 1) : "•",
      glyphSize: 14,
      glyphColor: "#fff",
      innerCircle: true,
      innerCircleColor: "#fff",
      innerCircleScale: 0.55,
      zLevel: waypoint.z,
    }).setLngLat({ lng: waypoint.lng, lat: waypoint.lat }).addTo(map);
    setMapZLevel(waypoint.z);
    map.stop?.();
    const camera = {
      center: [waypoint.lng, waypoint.lat],
      zoom: Math.max(safeZoom(map), 19),
      bearing: bearingTo(view.origin, waypoint),
      pitch: state.focusPitch?.() ?? 0,
      padding: { ...WAYPOINT_PADDING },
      duration: 350,
    };
    return moveCamera(map, camera);
  }
  function clearTargetMarker() {
    targetMarker?.remove();
    targetMarker = null;
  }
  function resizeMapSoon() {
    requestAnimationFrame(() => requestAnimationFrame(() => state.map()?.resize?.()));
  }
  return {
    clearTargetMarker,
    fitRoute,
    focusWaypoint,
    getMapZLevel,
    resizeMapSoon,
    setMapZLevel,
    startZWatch,
    stopZWatch,
  };
}
function finitePoint(point) {
  return Number.isFinite(point?.lng) && Number.isFinite(point?.lat);
}
function routePoints(route) {
  const candidates = [
    ...list(route?.legs).flatMap(leg => list(leg?.geometry ?? leg?.coords)),
    ...list(route?.stops),
    ...list(route?.checkpoints),
  ].filter(finitePoint);
  const unique = new Map();
  candidates.forEach(point => unique.set(`${point.lng},${point.lat}`, point));
  return [...unique.values()];
}
function list(value) {
  return Array.isArray(value) ? value : [];
}
function safeZoom(map) {
  const zoom = Number(map.getZoom?.());
  return Number.isFinite(zoom) ? zoom : 18;
}
function moveCamera(map, camera) {
  if (typeof map.easeTo === "function") map.easeTo(camera);
  else if (typeof map.flyTo === "function") map.flyTo(camera);
  else return false;
  return true;
}
