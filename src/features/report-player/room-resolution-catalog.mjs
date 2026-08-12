// FEATURE:      Room-resolution polygon catalogue
// SURFACE:      createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom
// WHY TOGETHER: Bulk polygon caching and local containment replace per-Cisco-point provider lookups.
// STATE:        One successfully loaded campus-room catalogue promise
// RULES:        Catalogue failures stay visible; raw Cisco coordinates never trigger provider calls.
// PROVENANCE:   Dynamic MazeMap room and corridor resolution

import { roomContainsPoint } from "../../domain/report-room-geometry.mjs";
import {
  catalogAreaKey, isAreaKind, isCommonArea, smallestContainingArea,
} from "./room-resolution-area-match.mjs";
import { cataloguePoints } from "./room-resolution-catalog-points.mjs";

export function createCampusRoomCatalog(resolveCampusRooms) {
  const points = new Map();
  let rooms = [];
  let pending = null;
  let loadedPointCount = -1;
  let loadedRevision = null;
  return async function loadCampusRooms(observations = []) {
    if (typeof resolveCampusRooms !== "function") return Promise.resolve([]);
    for (const point of cataloguePoints(observations)) {
      points.set(`${point.lng.toFixed(7)}:${point.lat.toFixed(7)}`, point);
    }
    if (pending) await pending;
    const revision = resolveCampusRooms.cacheRevision?.() ?? 0;
    if (revision !== loadedRevision) {
      rooms = [];
      loadedPointCount = -1;
      loadedRevision = revision;
    }
    if (loadedPointCount === points.size) return rooms;
    const requested = [...points.values()];
    const requestedCount = requested.length;
    const work = Promise.resolve().then(() => resolveCampusRooms(requested))
      .then(roomList).then(nextRooms => {
        rooms = mergeRoomLists(rooms, nextRooms);
        loadedPointCount = requestedCount;
        return rooms;
      });
    pending = work;
    try {
      return await work;
    } finally {
      if (pending === work) pending = null;
    }
  };
}

function mergeRoomLists(current, additions) {
  const unique = new Map();
  for (const room of [...current, ...additions]) {
    unique.set(catalogAreaKey(room), room);
  }
  return [...unique.values()];
}

export function expectedCatalogRoom(observation, catalogRooms, areaKind = "room") {
  const expectedId = String(observation.expectedPoiId ?? "").trim();
  const sameFloor = catalogRooms.filter(room => (
    room?.geometry && Number(room.z) === Number(observation.target.z)
  ));
  const rooms = sameFloor.filter(room => isAreaKind(room, areaKind));
  const captured = expectedId ? smallestContainingArea(rooms.filter(room => (
    String(room.id ?? "") === expectedId
  )), observation.target) : null;
  if (captured) return captured;
  const named = smallestContainingArea(rooms, observation.target);
  if (named || observation.observationKind !== "corridor-point"
    || areaKind !== "room") return named;
  return smallestContainingArea(sameFloor.filter(isCommonArea), observation.target);
}

export function knownRoomIndex(prepared, catalogRooms = [], areaKind = "room") {
  const unique = new Map();
  for (const room of catalogRooms) {
    if (room?.geometry && (isAreaKind(room, areaKind)
      || (areaKind === "room" && isCommonArea(room)))) {
      unique.set(catalogAreaKey(room), room);
    }
  }
  for (const item of prepared) {
    const room = item.expected;
    if (room?.geometry && !unique.has(catalogAreaKey(room))) {
      unique.set(catalogAreaKey(room), room);
    }
  }
  const floors = new Map();
  for (const room of unique.values()) {
    const key = floorKey(room.z);
    if (!floors.has(key)) floors.set(key, []);
    floors.get(key).push(room);
  }
  return floors;
}

export function observedKnownRoom(point, expected, knownRooms, areaKind = "room") {
  if (!point || !expected?.geometry) return { room: null, error: null };
  const candidates = knownRooms.get(floorKey(point.z)) ?? [];
  if (isCommonArea(expected)) {
    const named = smallestContainingArea(candidates.filter(room => (
      isAreaKind(room, areaKind)
    )), point);
    if (named) return { room: named, error: null };
    const common = roomContainsPoint(expected, point) ? expected : null;
    return { room: common, error: null };
  }
  if (roomContainsPoint(expected, point)) return { room: expected, error: null };
  const rooms = candidates.filter(room => (
    isAreaKind(room, areaKind) && catalogAreaKey(room) !== catalogAreaKey(expected)
  ));
  const room = smallestContainingArea(rooms, point);
  if (room) return { room, error: null };
  if (areaKind !== "room") return { room: null, error: null };
  const commonAreas = candidates.filter(isCommonArea);
  const sameBuilding = expected.buildingId
    ? commonAreas.filter(area => area.buildingId === expected.buildingId)
    : commonAreas;
  const common = smallestContainingArea(sameBuilding, point)
    ?? smallestContainingArea(commonAreas, point);
  return { room: common, error: null };
}

function roomList(value) {
  const rooms = Array.isArray(value) ? value : value?.rooms;
  if (!Array.isArray(rooms)) {
    throw new TypeError("Campus room catalogue must return an array of polygons");
  }
  return rooms.filter(room => room?.geometry);
}

function floorKey(value) {
  return String(Number(value));
}
