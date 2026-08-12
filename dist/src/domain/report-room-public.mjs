// FEATURE:      Public room-resolution area values
// SURFACE:      publicRoom(room), outsideDistanceForExpected(expected, point)
// WHY TOGETHER: Published area metadata and its distance semantics share one boundary.
// STATE:        None
// RULES:        Common floor outlines are typed and never report a misleading room distance.
// PROVENANCE:   Consolidated room and corridor evidence

import { distanceOutsideRoomM } from "./report-room-geometry.mjs";

export function publicRoom(room) {
  return room ? Object.freeze({
    id: room.id ?? null,
    identifier: room.identifier ?? null,
    name: room.name ?? null,
    z: Number.isFinite(room.z) ? room.z : null,
    geometry: ["Polygon", "MultiPolygon"].includes(room.geometry?.type)
      ? room.geometry : null,
    kind: room.kind ?? null,
    areaKind: room.areaKind ?? "room",
    floorId: room.floorId ?? null,
    buildingId: room.buildingId ?? null,
  }) : null;
}

export function outsideDistanceForExpected(expected, point) {
  return expected?.areaKind === "common-area"
    ? null : distanceOutsideRoomM(expected, point);
}
