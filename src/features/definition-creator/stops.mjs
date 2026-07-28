export function createExactStop(input) {
  return stopRecord({
    ...input,
    poiId: input.poiId || null,
    poiName: input.poiName || null,
    provenance: { method: "map" },
  });
}
export function createPoiStop({ id, poi, z, mapContext = null }) {
  const properties = poi?.properties ?? {};
  const position = poiPosition(poi);
  if (!position) throw new TypeError("poiId: selected POI has no usable centre");
  const poiId = String(
    poi.poiId ?? poi.id ?? properties.poiId ?? properties.id ?? "",
  ).trim();
  if (!poiId) throw new TypeError("poiId: selected POI has no identifier");
  const name = String(
    poi.name ?? poi.label ?? properties.title ?? properties.name ?? `POI ${poiId}`,
  ).trim();
  const poiZ = finite(
    z ?? poi.z ?? properties.zLevel ?? properties.z,
    "poi z-level",
  );
  return stopRecord({
    id,
    name,
    lng: position.lng,
    lat: position.lat,
    z: poiZ,
    poiId,
    poiName: name,
    locationType: "poi",
    provenance: { method: "poi" },
    _mapContext: mapContext,
  });
}
export function createGpsStop({ id, name, z, locationType = "outdoors", capture }) {
  const lng = finite(capture?.lng, "GPS longitude");
  const lat = finite(capture?.lat, "GPS latitude");
  const accuracyM = nonNegative(capture?.accuracyM, "GPS accuracy");
  const capturedAt = String(capture?.capturedAt ?? "");
  if (Number.isNaN(Date.parse(capturedAt))) {
    throw new TypeError("GPS timestamp: capture returned an invalid timestamp");
  }
  return stopRecord({
    id,
    name,
    lng,
    lat,
    z,
    poiId: null,
    poiName: null,
    locationType,
    provenance: {
      method: "gps",
      accuracyM,
      capturedAt: new Date(capturedAt).toISOString(),
      capturedPosition: { lng, lat },
      adjusted: false,
    },
  });
}
export function adjustStop(stop, input) {
  const adjusted = stopRecord({
    ...stop,
    ...input,
    id: stop.id,
    poiId: input.poiId ?? stop.poiId,
    poiName: input.poiName ?? stop.poiName,
    provenance: { ...stop.provenance },
  });
  if (adjusted.provenance.method === "gps") {
    adjusted.provenance.adjusted = true;
  }
  return adjusted;
}
export function gpsAccuracyWarning(stop, thresholdM) {
  if (stop?.provenance?.method !== "gps") return null;
  const reasons = [];
  if (stop.locationType !== "outdoors") {
    reasons.push("indoor GPS can be unreliable; confirm or adjust this stop");
  }
  const accuracy = Number(stop?.provenance?.accuracyM);
  if (accuracy > thresholdM) {
    reasons.push(
      `GPS accuracy ${accuracy.toFixed(1)} m exceeds `
      + `${Number(thresholdM).toFixed(1)} m`,
    );
  }
  if (!reasons.length) return null;
  return `${stop.name}: ${reasons.join("; ")}; the stop was still added.`;
}

function stopRecord(input) {
  const id = required(input.id, "stop id");
  const name = required(input.name, "stop name");
  const locationType = required(input.locationType, "locationType");
  const stop = {
    id,
    name,
    lng: finite(input.lng, `${name} longitude`),
    lat: finite(input.lat, `${name} latitude`),
    z: finite(input.z, `${name} z-level`),
    poiId: input.poiId == null ? null : String(input.poiId),
    poiName: input.poiName == null ? null : String(input.poiName),
    locationType,
    provenance: structuredClone(input.provenance),
  };
  if (input._mapContext) {
    stop._mapContext = structuredClone(input._mapContext);
  }
  return stop;
}

function poiPosition(poi) {
  const directLng = Number(poi?.lng);
  const directLat = Number(poi?.lat);
  if (Number.isFinite(directLng) && Number.isFinite(directLat)) {
    return { lng: directLng, lat: directLat };
  }
  const coordinates = poi?.point?.coordinates ?? poi?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  if (poi?.geometry?.type !== "Polygon") {
    return { lng: Number(coordinates[0]), lat: Number(coordinates[1]) };
  }
  const ring = coordinates[0];
  if (!Array.isArray(ring) || !ring.length) return null;
  return {
    lng: ring.reduce((sum, point) => sum + Number(point[0]), 0) / ring.length,
    lat: ring.reduce((sum, point) => sum + Number(point[1]), 0) / ring.length,
  };
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name}: is required`);
  return text;
}

function finite(value, name) {
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError(`${name}: must be a number`);
  return number;
}

function nonNegative(value, name) {
  const number = finite(value, name);
  if (number < 0) throw new TypeError(`${name}: must be zero or greater`);
  return number;
}
