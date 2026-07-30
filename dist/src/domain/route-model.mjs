import {
  CAMPUS_ID,
  ROUTE_FORMAT_VERSION,
  ROUTE_TOOL,
} from "./route-contract.mjs";

export function alphaTag(index) {
  let value = index + 1;
  let tag = "";
  while (value > 0) {
    value--;
    tag = String.fromCharCode(65 + (value % 26)) + tag;
    value = Math.floor(value / 26);
  }
  return tag;
}

export function normalizeStop(raw, index) {
  if (!raw || typeof raw !== "object") {
    throw new Error(`stop ${index + 1} is not an object`);
  }
  const lng = Number(raw.lng ?? raw.target?.lng);
  const lat = Number(raw.lat ?? raw.target?.lat);
  const z = Number(raw.z ?? raw.target?.z ?? 1);
  if (![lng, lat, z].every(Number.isFinite)) {
    throw new Error(`stop ${index + 1} has invalid lng/lat/z`);
  }

  const contextPoiId = raw.poiId ?? raw.poi_id
    ?? raw.poi?.id ?? raw.poi?.poiId ?? null;
  const targetType = raw.targetType === "point" || raw.targetType === "poi"
    ? raw.targetType
    : (contextPoiId != null ? "poi" : "point");
  const poi = normalizePoi(raw, contextPoiId, { lng, lat, z });
  const rawPoiName = raw.poiName ?? raw.poi_name ?? poi?.label ?? null;
  const explicitLocationType = ["poi", "outdoors", "unknown"]
    .includes(raw.locationType) ? raw.locationType : null;
  const locationType = explicitLocationType
    || (contextPoiId != null
      ? "poi"
      : (/^outdoors?$/i.test(rawPoiName || "") ? "outdoors" : "unknown"));
  const poiName = rawPoiName
    || (locationType === "outdoors" ? "Outdoors" : null);
  const label = raw.label || poi?.label
    || `${lat.toFixed(6)}, ${lng.toFixed(6)} (z${z})`;
  return {
    ...raw,
    tag: raw.tag || alphaTag(index),
    label,
    poiId: contextPoiId,
    poiName,
    locationType,
    lng,
    lat,
    z,
    targetType,
    poi,
  };
}

function normalizePoi(raw, contextPoiId, target) {
  if (raw.poi && typeof raw.poi === "object") {
    const poiLng = Number(raw.poi.lng);
    const poiLat = Number(raw.poi.lat);
    const poiZ = Number(raw.poi.z ?? target.z);
    return {
      ...raw.poi,
      id: contextPoiId,
      label: raw.poi.label || raw.poi.title || raw.poiName
        || raw.poi_name || raw.label || "",
      lng: Number.isFinite(poiLng) ? poiLng : target.lng,
      lat: Number.isFinite(poiLat) ? poiLat : target.lat,
      z: Number.isFinite(poiZ) ? poiZ : target.z,
    };
  }
  if (contextPoiId == null) return null;
  return {
    id: contextPoiId,
    label: raw.poiName || raw.poi_name || raw.label || `POI ${contextPoiId}`,
    ...target,
  };
}

export function normalizeStops(rawStops) {
  if (!Array.isArray(rawStops)) throw new Error("no stops array");
  return rawStops.map((stop, index) => normalizeStop(stop, index));
}

export function parseRouteDefinition(data, fallbackName, campusId = CAMPUS_ID) {
  const routeStops = normalizeStops(Array.isArray(data) ? data : data?.stops);
  if (!routeStops.length) throw new Error("route has no stops");
  const inputCampusId = data.campusId ?? data.meta?.campusId;
  if (inputCampusId != null && Number(inputCampusId) !== campusId) {
    throw new Error(`route campus ${inputCampusId} does not match campus ${campusId}`);
  }
  return {
    name: data.name || data.meta?.routeName || fallbackName || "Unnamed route",
    stops: routeStops,
  };
}

export function routeDefinition(name, routeStops, options = {}) {
  const now = options.now ?? (() => new Date());
  return {
    tool: ROUTE_TOOL,
    kind: "route",
    version: ROUTE_FORMAT_VERSION,
    name,
    campusId: options.campusId ?? CAMPUS_ID,
    exportedAt: now().toISOString(),
    stops: normalizeStops(routeStops),
  };
}
