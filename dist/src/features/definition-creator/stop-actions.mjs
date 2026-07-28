import {
  adjustStop,
  createExactStop,
  createGpsStop,
  createPoiStop,
  gpsAccuracyWarning,
} from "./stops.mjs";
import { mapContextFromPoi } from "./map-coverage.mjs";

export function createStopActions({
  lookupPoi,
  capturePosition,
  accuracyThresholdM = 20,
}) {
  function exact(fields, id) {
    if (!fields._mapContext) {
      throw new TypeError(
        "Map point: click the engaged map before adding an exact stop",
      );
    }
    return createExactStop({
      id,
      name: required(fields.stopName, "stopName"),
      lng: number(fields.stopLng, "stopLng"),
      lat: number(fields.stopLat, "stopLat"),
      z: number(fields.stopZ, "stopZ"),
      poiId: fields._mapContext.poi?.id,
      poiName: fields._mapContext.poi?.name,
      locationType: required(fields.locationType, "locationType"),
      _mapContext: fields._mapContext,
    });
  }

  async function poi(fields, id) {
    const poiId = required(fields.poiId, "poiId");
    const staged = stagedPoi(fields._mapContext?.poi, poiId);
    const value = staged ?? await lookupPoiValue(lookupPoi, poiId);
    return createPoiStop({
      id,
      poi: value,
      mapContext: fields._mapContext ?? mapContextFromPoi(value),
    });
  }

  async function gps(fields, id) {
    const name = required(fields.gpsName, "gpsName");
    const z = number(fields.gpsZ, "gpsZ");
    const locationType = required(fields.locationType, "locationType");
    if (typeof capturePosition !== "function") {
      throw new Error("GPS capture is unavailable.");
    }
    const capture = await capturePosition();
    const stop = createGpsStop({ id, name, z, locationType, capture });
    return { stop, warning: gpsAccuracyWarning(stop, accuracyThresholdM) };
  }

  function adjust(fields, stop) {
    if (!stop) throw new Error("Select a stop to adjust.");
    return adjustStop(stop, {
      name: required(fields.stopName, "stopName"),
      lng: number(fields.stopLng, "stopLng"),
      lat: number(fields.stopLat, "stopLat"),
      z: number(fields.stopZ, "stopZ"),
      locationType: required(fields.locationType, "locationType"),
      _mapContext: fields._mapContext ?? stop._mapContext,
    });
  }

  return { adjust, exact, gps, poi };
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name}: is required`);
  return text;
}

function number(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name}: is required`);
  const result = Number(text);
  if (!Number.isFinite(result)) throw new TypeError(`${name}: must be a number`);
  return result;
}

function stagedPoi(poi, id) {
  if (String(poi?.id ?? "") !== id || !poi?.center) return null;
  return { id: poi.id, name: poi.name, ...poi.center };
}

async function lookupPoiValue(lookupPoi, id) {
  if (typeof lookupPoi !== "function") {
    throw new Error("poiId: POI lookup is unavailable");
  }
  try {
    return await lookupPoi(id);
  } catch (error) {
    throw new Error(`poiId ${id}: ${error.message}`);
  }
}
