// FEATURE:      Dynamic room spacing-mark planning
// SURFACE:      planStagedLegMarks(options)
// WHY TOGETHER: Corridor-leg fetch and planned-convention mark generation form one step.
// STATE:        None
// RULES:        Marks mirror planned intermediate checkpoints; short legs produce none.
// PROVENANCE:   Structured dynamic capture request

import {
  createRouteLegV3,
  generateRouteCheckpointsV3,
} from "../../domain/creator-route-v3.mjs";

export async function planStagedLegMarks(options) {
  const { fromStop, target, spacingM, routeBetween } = options;
  const legIndex = requiredIndex(options.legIndex);
  const spacing = Number(spacingM) || 0;
  if (!(spacing > 0)) return { legId: `leg-${legIndex + 1}`, marks: [] };
  if (typeof routeBetween !== "function") {
    throw new TypeError("routeBetween: must be a function");
  }
  const toStop = {
    id: `stop-${legIndex + 2}`,
    lng: Number(target?.lng),
    lat: Number(target?.lat),
    z: Number(target?.z),
  };
  const geometry = await routeBetween(
    structuredClone(fromStop),
    { lng: toStop.lng, lat: toStop.lat, z: toStop.z },
  );
  const leg = createRouteLegV3(fromStop, toStop, geometry, legIndex);
  const generated = generateRouteCheckpointsV3(
    [fromStop, toStop],
    [leg],
    spacing,
  ).checkpoints;
  return {
    legId: leg.id,
    marks: generated
      .filter(checkpoint => checkpoint.type === "intermediate")
      .map(checkpoint => ({
        lng: checkpoint.lng,
        lat: checkpoint.lat,
        z: checkpoint.z,
        legId: checkpoint.legId,
        spacingBasisM: checkpoint.spacingBasisM,
      })),
  };
}

function requiredIndex(value) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError("legIndex: must be a non-negative integer");
  }
  return value;
}
