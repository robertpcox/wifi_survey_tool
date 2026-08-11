// FEATURE:      Room-resolution polygon catalogue
// SURFACE:      createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom
// WHY TOGETHER: Bulk polygon caching and local containment replace per-Cisco-point provider lookups.
// STATE:        One successfully loaded campus-room catalogue promise
// RULES:        Catalogue failures stay visible; raw Cisco coordinates never trigger provider calls.
// PROVENANCE:   Dynamic MazeMap room and corridor resolution

import { roomContainsPoint } from "../../domain/report-room-geometry.mjs";
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
    unique.set(roomKey(room), room);
  }
  return [...unique.values()];
}

export function expectedCatalogRoom(observation, catalogRooms) {
  const expectedId = String(observation.expectedPoiId ?? "").trim();
  const candidates = catalogRooms.filter(room => (
    room?.geometry && Number(room.z) === Number(observation.target.z)
  ));
  const captured = expectedId ? smallestContaining(candidates.filter(room => (
    String(room.id ?? "") === expectedId
  )), observation.target) : null;
  if (captured) return captured;
  return smallestContaining(candidates, observation.target);
}

export function knownRoomIndex(prepared, catalogRooms = []) {
  const unique = new Map();
  for (const room of catalogRooms) {
    if (room?.geometry) unique.set(roomKey(room), room);
  }
  for (const item of prepared) {
    const room = item.expected;
    if (room?.geometry && !unique.has(roomKey(room))) {
      unique.set(roomKey(room), room);
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

export function observedKnownRoom(point, expected, knownRooms) {
  if (!point || !expected?.geometry) return { room: null, error: null };
  if (roomContainsPoint(expected, point)) return { room: expected, error: null };
  const candidates = (knownRooms.get(floorKey(point.z)) ?? [])
    .filter(room => roomKey(room) !== roomKey(expected));
  const room = smallestContaining(candidates, point);
  return { room: room ?? null, error: null };
}

function roomList(value) {
  const rooms = Array.isArray(value) ? value : value?.rooms;
  if (!Array.isArray(rooms)) {
    throw new TypeError("Campus room catalogue must return an array of polygons");
  }
  return rooms.filter(room => room?.geometry);
}

function roomKey(room) {
  const id = String(room?.id ?? "").trim();
  return id
    ? `${floorKey(room.z)}:poi:${id}`
    : `${floorKey(room.z)}:geometry:${JSON.stringify(room.geometry)}`;
}

function floorKey(value) {
  return String(Number(value));
}

function smallestContaining(rooms, point) {
  return rooms.filter(room => roomContainsPoint(room, point))
    .sort((left, right) => geometryArea(left.geometry) - geometryArea(right.geometry)
      || roomKey(left).localeCompare(roomKey(right)))[0] ?? null;
}

function geometryArea(geometry) {
  const polygons = geometry?.type === "Polygon"
    ? [geometry.coordinates]
    : (geometry?.type === "MultiPolygon" ? geometry.coordinates : []);
  return polygons.reduce((total, polygon) => total + polygonArea(polygon), 0);
}

function polygonArea(rings = []) {
  if (!rings.length) return Infinity;
  return Math.max(0, Math.abs(ringArea(rings[0]))
    - rings.slice(1).reduce((total, ring) => total + Math.abs(ringArea(ring)), 0));
}

function ringArea(ring = []) {
  const origin = ring[0];
  if (!origin) return 0;
  let area = 0;
  for (let index = 1; index < ring.length - 1; index++) {
    const current = ring[index];
    const next = ring[index + 1];
    const currentX = Number(current?.[0]) - Number(origin[0]);
    const currentY = Number(current?.[1]) - Number(origin[1]);
    const nextX = Number(next?.[0]) - Number(origin[0]);
    const nextY = Number(next?.[1]) - Number(origin[1]);
    area += currentX * nextY - nextX * currentY;
  }
  return area / 2;
}
