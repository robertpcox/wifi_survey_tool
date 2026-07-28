export function mapContextFromPoi(poi, selectedZ) {
  const properties = poi?.properties ?? {};
  const z = finiteOrNull(
    properties.zLevel ?? properties.z ?? poi?.z ?? selectedZ,
  );
  return {
    building: {
      id: textOrNull(properties.buildingId ?? poi?.buildingId),
      name: textOrNull(properties.buildingName ?? poi?.buildingName),
    },
    floor: {
      id: textOrNull(properties.floorId ?? poi?.floorId),
      name: textOrNull(properties.floorName ?? poi?.floorName),
      z,
    },
    poi: {
      id: textOrNull(
        poi?.poiId ?? poi?.id ?? properties.poiId ?? properties.id,
      ),
      name: textOrNull(
        poi?.name ?? poi?.label ?? properties.title ?? properties.name,
      ),
    },
  };
}

export function deriveMapCoverage({
  stops = [],
  legs = [],
  fallbackMeta = null,
  strict = true,
} = {}) {
  const buildings = new Map();
  const floorNames = new Map();
  seedFallback(buildings, floorNames, fallbackMeta);
  const contexts = [];
  for (const [index, stop] of stops.entries()) {
    const context = stop?._mapContext;
    if (context) contexts.push(context);
    if (strict && isIndoorMapStop(stop) && !context && !fallbackMeta) {
      throw new TypeError(
        `route.stops.${index}: click the engaged map to derive its building and floor`,
      );
    }
  }
  for (const context of contexts) {
    addBuilding(buildings, context?.building, strict);
    addFloorName(floorNames, context?.floor, strict);
  }
  const levels = routeLevels(stops, legs);
  if (strict && !buildings.size) {
    throw new TypeError(
      "meta.buildings: add a stop from a clicked point inside a mapped building",
    );
  }
  const zLevelNames = {};
  for (const z of levels) {
    const name = floorNames.get(String(z));
    if (strict && !name) {
      throw new TypeError(
        `meta.zLevelNames.${z}: click a mapped point on this z-level to derive its name`,
      );
    }
    zLevelNames[String(z)] = name ?? `z${z}`;
  }
  return {
    buildings: [...buildings.values()],
    zLevels: levels,
    zLevelNames,
  };
}

function seedFallback(buildings, floors, meta) {
  for (const building of meta?.buildings ?? []) {
    addBuilding(buildings, building, false);
  }
  for (const z of meta?.zLevels ?? []) {
    const name = textOrNull(meta?.zLevelNames?.[String(z)]);
    if (name) floors.set(String(Number(z)), name);
  }
}

function addBuilding(target, building, strict) {
  const id = textOrNull(building?.id);
  const name = textOrNull(building?.name);
  if (!id || !name) {
    if (strict) {
      throw new TypeError(
        "Map point: MazeMap did not return a building ID and name",
      );
    }
    return;
  }
  const prior = target.get(id);
  if (strict && prior && prior.name !== name) {
    throw new TypeError(`Map point: building ${id} has conflicting names`);
  }
  if (!prior) target.set(id, { id, name });
}

function addFloorName(target, floor, strict) {
  const z = finiteOrNull(floor?.z);
  const name = textOrNull(floor?.name);
  if (z === null || !name) {
    if (strict) {
      throw new TypeError(
        "Map point: MazeMap did not return a z-level and floor name",
      );
    }
    return;
  }
  const key = String(z);
  const prior = target.get(key);
  if (strict && prior && prior !== name) {
    throw new TypeError(`Map point: z-level ${z} has conflicting floor names`);
  }
  if (!prior) target.set(key, name);
}

function routeLevels(stops, legs) {
  const levels = new Set();
  const add = value => {
    const z = finiteOrNull(value);
    if (z !== null) levels.add(z);
  };
  stops.forEach(stop => add(stop?.z));
  legs.forEach(leg => (leg?.geometry ?? []).forEach(point => add(point?.z)));
  return [...levels].sort((left, right) => left - right);
}

function isIndoorMapStop(stop) {
  return stop?.locationType !== "outdoors"
    && ["map", "poi"].includes(stop?.provenance?.method);
}

function textOrNull(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function finiteOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
