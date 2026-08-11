// FEATURE:      Local catalogue-area matching
// SURFACE:      catalogAreaKey, isCommonArea, smallestContainingArea
// WHY TOGETHER: Area identity, type priority, and containment ordering form one matcher.
// STATE:        None
// RULES:        A floor outline is common-area truth, never a named room candidate.
// PROVENANCE:   Bulk MazeMap room and corridor resolution

import { roomContainsPoint } from "../../domain/report-room-geometry.mjs";

export function isCommonArea(area) {
  return area?.areaKind === "common-area";
}

export function catalogAreaKey(area) {
  const id = String(area?.id ?? "").trim();
  const floor = String(Number(area?.z));
  return id
    ? `${floor}:${isCommonArea(area) ? "area" : "poi"}:${id}`
    : `${floor}:geometry:${JSON.stringify(area?.geometry)}`;
}

export function smallestContainingArea(areas, point) {
  return areas.filter(area => roomContainsPoint(area, point))
    .sort((left, right) => geometryArea(left.geometry) - geometryArea(right.geometry)
      || catalogAreaKey(left).localeCompare(catalogAreaKey(right)))[0] ?? null;
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
