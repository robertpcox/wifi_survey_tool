import { alphaTag } from "./route-model.mjs";

export function poiToStop(poi) {
  const properties = poi.properties || {};
  const position = poiPosition(poi);
  if (!position) return null;
  const z = (typeof properties.zLevel === "number"
    ? properties.zLevel
    : properties.z) ?? 1;
  const label = properties.title || `POI ${properties.poiId}`;
  const context = {
    id: properties.poiId ?? null,
    label,
    lng: position.lng,
    lat: position.lat,
    z,
  };
  return {
    label,
    poiId: context.id,
    poiName: context.label,
    locationType: context.id != null ? "poi" : "unknown",
    lng: position.lng,
    lat: position.lat,
    z,
    targetType: "poi",
    poi: context,
  };
}

function poiPosition(poi) {
  if (poi.point?.coordinates) {
    return { lng: poi.point.coordinates[0], lat: poi.point.coordinates[1] };
  }
  if (poi.geometry?.type === "Point") {
    return { lng: poi.geometry.coordinates[0], lat: poi.geometry.coordinates[1] };
  }
  if (poi.geometry?.type !== "Polygon") return null;
  const coordinates = poi.geometry.coordinates[0];
  return {
    lng: coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0)
      / coordinates.length,
    lat: coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0)
      / coordinates.length,
  };
}

export function pointToStop(lng, lat, z, poiStop) {
  const poi = poiStop?.poi ? { ...poiStop.poi } : null;
  return {
    label: poi?.label || `${lat.toFixed(6)}, ${lng.toFixed(6)} (z${z})`,
    poiId: poi?.id ?? null,
    poiName: poi?.label ?? null,
    locationType: poi?.id != null ? "poi" : "unknown",
    lng,
    lat,
    z,
    targetType: "point",
    poi,
  };
}

export function outdoorsStop(pointStop) {
  return {
    ...pointStop,
    label: `Outdoors — ${pointStop.lat.toFixed(6)}, ${pointStop.lng.toFixed(6)}`,
    poiId: null,
    poiName: "Outdoors",
    locationType: "outdoors",
    poi: null,
  };
}

export function tagOf(stops, index) {
  return stops[index]?.tag || alphaTag(index);
}

export function stopName(stops, index) {
  return `${tagOf(stops, index)} — ${stops[index].label}`;
}

export function stopTargetTitle(stop) {
  if (stop.targetType === "poi") {
    return `POI centre target: ${stop.lat.toFixed(6)}, `
      + `${stop.lng.toFixed(6)}, z${stop.z}`;
  }
  const context = stop.poiName ? ` in ${stop.poiName}` : "";
  return `Exact point${context}: ${stop.lat.toFixed(6)}, `
    + `${stop.lng.toFixed(6)}, z${stop.z}`;
}
