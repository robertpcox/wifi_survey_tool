// FEATURE:      Dynamic room map-point capture
// SURFACE:      dynamicRoomPointFromMapClick(event, options)
// WHY TOGETHER: Click truth and optional MazeMap context must resolve without coordinate drift.
// STATE:        None
// RULES:        Click longitude/latitude and current map z-level are always authoritative.
// PROVENANCE:   Step 4 Runner dynamic-room extension

export async function dynamicRoomPointFromMapClick(event, options = {}) {
  const value = event?.lngLat;
  const lng = Number(value?.lng);
  const lat = Number(value?.lat);
  const currentZ = typeof options.currentZLevel === "function"
    ? options.currentZLevel()
    : options.currentZLevel;
  const z = Number(currentZ ?? event?.zLevel ?? event?.z);
  if (![lng, lat, z].every(Number.isFinite)) {
    throw new TypeError(
      "Map click: lngLat and the current z-level must be finite numbers",
    );
  }
  const clicked = { lng, lat, z };
  if (typeof options.describePoint !== "function") {
    return coordinatePoint(clicked);
  }
  try {
    const context = await options.describePoint(lng, lat, z);
    return enrichedPoint(clicked, context);
  } catch {
    return coordinatePoint(clicked);
  }
}

function enrichedPoint(clicked, value) {
  const context = value ?? {};
  const poiName = textOrNull(context.poi?.name);
  return {
    ...clicked,
    name: poiName ?? coordinateName(clicked),
    _mapContext: {
      building: {
        id: textOrNull(context.building?.id),
        name: textOrNull(context.building?.name),
      },
      floor: {
        id: textOrNull(context.floor?.id),
        name: textOrNull(context.floor?.name) ?? `z${clicked.z}`,
        z: clicked.z,
      },
      poi: {
        id: textOrNull(context.poi?.id),
        name: poiName,
        center: cloneCenter(context.poi?.center),
      },
    },
  };
}

function coordinatePoint(clicked) {
  return {
    ...clicked,
    name: coordinateName(clicked),
    _mapContext: {
      coordinateOnly: true,
      building: { id: null, name: null },
      floor: { id: null, name: `z${clicked.z}`, z: clicked.z },
      poi: { id: null, name: null, center: null },
    },
  };
}

function coordinateName(point) {
  return `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
}

function cloneCenter(value) {
  if (!value || typeof value !== "object") return null;
  return structuredClone(value);
}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
