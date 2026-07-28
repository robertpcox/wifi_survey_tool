import { CAMPUS_ID, MAP_STYLE } from "../../domain/route-contract.mjs";
import { createMapLayers } from "./layers.mjs";

export function createMazeMapAdapter(options = {}) {
  const Mazemap = options.Mazemap ?? globalThis.Mazemap;
  const campusId = options.campusId ?? CAMPUS_ID;
  let currentZLevel = 1;
  let layers = null;
  let map = null;
  let targetMarker = null;
  let zWatch = null;

  async function launch(viewToken, onMapClick) {
    if (!viewToken) throw new Error("Map access is required");
    Mazemap.Config.setMazemapViewToken(viewToken);
    map = new Mazemap.Map({
      container: options.container ?? "map",
      campuses: campusId,
      zoom: 18,
      center: options.center ?? [170.508292, -45.872428],
    });
    await new Promise(resolve => map.on("load", resolve));
    currentZLevel = getMapZLevel() ?? 1;
    layers = createMapLayers(map, () => currentZLevel);
    layers.ensureLayers();
    if (onMapClick) map.on("click", onMapClick);
    return currentZLevel;
  }

  function getMapZLevel() {
    if (map && typeof map.getZLevel === "function") {
      try {
        return map.getZLevel();
      } catch {}
    }
    if (map && typeof map.zLevel === "number") return map.zLevel;
    return currentZLevel;
  }

  function setMapZLevel(z) {
    if (typeof map?.setZLevel === "function") map.setZLevel(z);
    else if (typeof map?.setZlevel === "function") map.setZlevel(z);
  }

  function startZWatch(onChange) {
    clearInterval(zWatch);
    zWatch = setInterval(() => {
      const z = getMapZLevel();
      if (z == null || z === currentZLevel) return;
      currentZLevel = z;
      layers.applyZStyling();
      onChange?.(z);
    }, 250);
  }

  function focusWaypoint(waypoint) {
    clearTargetMarker();
    targetMarker = new Mazemap.MazeMarker({
      color: MAP_STYLE.waypointCurrent,
      size: 42,
      glyph: String(waypoint.seq + 1),
      glyphSize: 14,
      glyphColor: "#fff",
      innerCircle: true,
      innerCircleColor: "#fff",
      innerCircleScale: 0.55,
      zLevel: waypoint.z,
    }).setLngLat({
      lng: waypoint.lng,
      lat: waypoint.lat,
    }).addTo(map);
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
    requestAnimationFrame(() => requestAnimationFrame(() => map?.resize?.()));
  }

  return {
    clearTargetMarker,
    drawRoute: legs => layers?.drawRoute(legs),
    drawStops: stops => layers?.drawStops(stops),
    drawTrails: samples => layers?.drawTrails(samples),
    drawWaypoints: waypoints => layers?.drawWaypoints(waypoints),
    focusWaypoint,
    get currentZLevel() {
      return currentZLevel;
    },
    get ready() {
      return Boolean(map && layers);
    },
    getMapZLevel,
    launch,
    resizeMapSoon,
    setActiveLeg: legIndex => layers?.setActiveLeg(legIndex),
    setMapZLevel,
    startZWatch,
  };
}
