// FEATURE:      Dynamic room definition input
// SURFACE:      dynamicDefinitionInput(options, plan)
// WHY TOGETHER: Routed stops, exact dwell, and live map coverage form one V3 route plan.
// STATE:        None
// RULES:        Stop-only checkpoints use zero spacing; runtime map context is sanitized later.
// PROVENANCE:   Dynamic room-survey Runner request

import {
  createRouteLegV3,
  generateRouteCheckpointsV3,
} from "../../domain/creator-route-v3.mjs";

export function dynamicDefinitionInput(options, plan) {
  const stops = structuredClone(plan.stops);
  const legs = plan.legs.map((leg, index) => createRouteLegV3(
    stops[index],
    stops[index + 1],
    leg.geometry,
    index,
  ));
  const coverage = dynamicCoverage(options.definitionInput.meta, stops, legs);
  const captured = Array.isArray(options.checkpoints);
  const checkpoints = captured
    ? structuredClone(options.checkpoints)
    : generateRouteCheckpointsV3(stops, legs, 0).checkpoints
      .map(checkpoint => ({
        ...checkpoint,
        dwellSeconds: dwellFor(
          options.dwellSecondsByStopId,
          checkpoint.stopId,
        ),
      }));
  return {
    ...options.definitionInput,
    meta: { ...options.definitionInput.meta, ...coverage },
    stops,
    legs,
    checkpoints,
    ...(captured ? { checkpointOrigin: "captured" } : {}),
    checkpointSpacingM: captured ? Number(options.markSpacingM) || 0 : 0,
    checkpointDwellSeconds: 0,
  };
}

function dynamicCoverage(meta, stops, legs) {
  const buildings = new Map((meta.buildings ?? []).map(building => [
    String(building.id),
    structuredClone(building),
  ]));
  const floorNames = new Map((meta.zLevels ?? []).map(z => [
    String(Number(z)),
    meta.zLevelNames?.[String(z)] ?? `z${Number(z)}`,
  ]));
  for (const stop of stops) {
    const context = stop._mapContext;
    const buildingId = clean(context?.building?.id);
    const buildingName = clean(context?.building?.name);
    if (buildingId && buildingName) {
      buildings.set(buildingId, { id: buildingId, name: buildingName });
    }
    const floorName = clean(context?.floor?.name);
    if (floorName) floorNames.set(String(stop.z), floorName);
  }
  const levels = new Set(stops.map(stop => Number(stop.z)));
  for (const leg of legs) {
    for (const point of leg.geometry ?? []) levels.add(Number(point.z));
  }
  const zLevels = [...levels].filter(Number.isFinite)
    .sort((left, right) => left - right);
  return {
    buildings: [...buildings.values()],
    zLevels,
    zLevelNames: Object.fromEntries(zLevels.map(z => [
      String(z),
      floorNames.get(String(z)) ?? `z${z}`,
    ])),
  };
}

function dwellFor(values, stopId) {
  const value = values?.[stopId] ?? 0;
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new TypeError(
      `dwellSecondsByStopId.${stopId}: must be a non-negative number`,
    );
  }
  return seconds;
}

function clean(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
