// FEATURE:      Captured-checkpoint route authoring
// SURFACE:      capturedCheckpointsV3(stops, legs, supplied, spacingM)
// WHY TOGETHER: Live-captured stop and mark checkpoints form one authored route plan.
// STATE:        None
// RULES:        Captured order is truth; marks bind to the leg walked and untapped marks never exist.
// PROVENANCE:   Structured dynamic capture request

export function capturedCheckpointsV3(stops, legs, supplied, spacingM) {
  if (!Array.isArray(supplied) || supplied.length < 2) {
    throw new TypeError("route.checkpoints: captured checkpoints are required");
  }
  const spacing = Number(spacingM) || 0;
  let stopCursor = 0;
  const checkpoints = supplied.map((checkpoint, index) => {
    assertIdentity(checkpoint, index);
    if (checkpoint.spacingBasisM !== spacing) {
      throw new TypeError(
        `route.checkpoints.${index}.spacingBasisM: must equal ${spacing}`,
      );
    }
    if (checkpoint.type === "stop") {
      const stop = stops[stopCursor++];
      if (!stop || checkpoint.stopId !== stop.id || checkpoint.legId !== null
        || !samePoint(checkpoint, stop)) {
        throw new TypeError(
          `route.checkpoints.${index}: must match captured stop ${stopCursor}`,
        );
      }
    } else {
      const leg = legs[stopCursor - 1];
      if (!leg || checkpoint.legId !== leg.id || checkpoint.stopId !== null) {
        throw new TypeError(
          `route.checkpoints.${index}: must reference the leg being walked`,
        );
      }
    }
    return {
      id: checkpoint.id,
      sequence: checkpoint.sequence,
      type: checkpoint.type,
      lng: checkpoint.lng,
      lat: checkpoint.lat,
      z: checkpoint.z,
      stopId: checkpoint.stopId,
      legId: checkpoint.legId,
      spacingBasisM: spacing,
      dwellSeconds: nonNegative(
        checkpoint.dwellSeconds ?? 0,
        `route.checkpoints.${index}.dwellSeconds`,
      ),
    };
  });
  if (stopCursor !== stops.length) {
    throw new TypeError(
      "route.checkpoints: every captured stop requires a stop checkpoint",
    );
  }
  return checkpoints;
}

function assertIdentity(checkpoint, index) {
  if (checkpoint?.id !== `checkpoint-${index + 1}`
    || checkpoint?.sequence !== index) {
    throw new TypeError(
      `route.checkpoints.${index}: captured identity must stay sequential`,
    );
  }
  if (!["stop", "intermediate"].includes(checkpoint?.type)) {
    throw new TypeError(`route.checkpoints.${index}.type: must be stop or intermediate`);
  }
  for (const key of ["lng", "lat", "z"]) {
    if (!Number.isFinite(checkpoint?.[key])) {
      throw new TypeError(`route.checkpoints.${index}.${key}: must be a finite number`);
    }
  }
}

function samePoint(left, right) {
  return left.lng === right.lng && left.lat === right.lat && left.z === right.z;
}

function nonNegative(value, path) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw new TypeError(`${path}: must be a non-negative finite number`);
  }
  return number;
}
