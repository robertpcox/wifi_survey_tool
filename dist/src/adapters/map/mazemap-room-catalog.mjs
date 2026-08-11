// FEATURE:      MazeMap building room catalogue
// SURFACE:      loadMazeMapRoomCatalog(options)
// WHY TOGETHER: Building discovery, exhaustive POI paging, and polygon normalization share one query.
// STATE:        None
// RULES:        Query each discovered building; advance full pages by POI ID without per-point API calls.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import { normalizeMazeMapRoom } from "./mazemap-room.mjs";
import { fetchAllPoiPages } from "./mazemap-poi-pages.mjs";

export async function loadMazeMapRoomCatalog({
  sdk, catalog, campusId, map, points = [], cache = new Map(),
}) {
  if (typeof sdk.Data?.getPois !== "function") {
    throw new Error("MazeMap campus room catalogue is unavailable in this SDK");
  }
  const campusid = positiveId(campusId);
  if (!campusid) {
    throw new Error("MazeMap campus room catalogue requires a campus ID");
  }
  const queries = catalogQueries({ sdk, catalog, campusid, map, points });
  const batches = await Promise.all(queries.map(query => (
    fetchAllPoiPages(sdk.Data, query, cache)
  )));
  const unique = new Map();
  for (const poi of batches.flat()) {
    const room = normalizeMazeMapRoom(poi);
    if (!room?.geometry || !Number.isFinite(room.z)) continue;
    const key = room.id
      ? `${room.z}:poi:${room.id}`
      : `${room.z}:geometry:${JSON.stringify(room.geometry)}`;
    if (!unique.has(key)) unique.set(key, room);
  }
  const rooms = [...unique.values()];
  if (!rooms.length) {
    throw new Error("MazeMap campus room catalogue returned no polygon POIs");
  }
  return rooms;
}
function catalogQueries({ sdk, catalog, campusid, map, points }) {
  const unique = new Map();
  for (const item of catalogItems(catalog?.buildings, "buildings")) {
    addQuery(unique, campusid, catalogId(item));
  }
  if (map && typeof sdk.Util?.getMapClickData === "function") {
    for (const point of uniquePoints(points)) {
      let clicked;
      try {
        clicked = sdk.Util.getMapClickData(map, point);
      } catch {
        continue;
      }
      const campuses = ids(clicked?.campusIds);
      const buildings = ids(clicked?.buildingIds);
      if (campuses.length && !campuses.includes(campusid)) continue;
      for (const buildingid of buildings) {
        addQuery(unique, campusid, buildingid);
      }
    }
  }
  return unique.size ? [...unique.values()] : [{ campusid }];
}
function uniquePoints(points) {
  const unique = new Map();
  for (const point of points) {
    if (![point?.lng, point?.lat].every(Number.isFinite)) continue;
    unique.set(`${point.lng.toFixed(7)}:${point.lat.toFixed(7)}`, {
      lng: point.lng, lat: point.lat,
    });
  }
  return unique.values();
}

function addQuery(unique, campusid, buildingid) {
  const owner = positiveId(campusid);
  const building = positiveId(buildingid);
  if (!owner || !building) return;
  unique.set(`${owner}:${building}`, { campusid: owner, buildingid: building });
}

function ids(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(positiveId).filter(Boolean))];
}

function catalogItems(value, key) {
  return Array.isArray(value) ? value : value?.features ?? value?.[key] ?? [];
}

function catalogId(item) {
  const data = item?.properties ?? item ?? {};
  return data.id ?? data.buildingId ?? item?.id;
}

function positiveId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}
