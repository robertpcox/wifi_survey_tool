import { MAP_STYLE } from "../../domain/route-contract.mjs";
import { numericZ } from "./mazemap-runtime.mjs";

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
    clearInterval(zWatch);
    zWatch = setInterval(() => {
      const z = getMapZLevel();
      if (z == null || z === state.currentZ()) return;
      state.setCurrentZ(z);
      state.layers()?.applyZStyling();
      onChange?.(z);
    }, 250);
  }

  function focusWaypoint(waypoint) {
    const map = state.map();
    const sdk = state.sdk();
    clearTargetMarker();
    targetMarker = new sdk.MazeMarker({
      color: MAP_STYLE.waypointCurrent,
      size: 42,
      glyph: String(waypoint.seq + 1),
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
      zoom: Math.max(map.getZoom(), 19),
      duration: 350,
    };
    if (typeof map.easeTo === "function") map.easeTo(camera);
    else map.flyTo(camera);
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
    focusWaypoint,
    getMapZLevel,
    resizeMapSoon,
    setMapZLevel,
    startZWatch,
  };
}
