export const WALKING_SPEED_MPS = 1;

export function estimateRouteDuration({
  distanceM,
  checkpointCount,
  dwellSeconds,
  walkingSpeedMps = WALKING_SPEED_MPS,
}) {
  const distance = finiteAtLeast(distanceM, 0, "distanceM");
  const count = finiteAtLeast(checkpointCount, 0, "checkpointCount");
  const dwellPerCheckpoint = finiteAtLeast(
    dwellSeconds,
    0,
    "dwellSeconds",
  );
  const speed = finiteAtLeast(walkingSpeedMps, Number.EPSILON, "walkingSpeedMps");
  const walkingSeconds = distance / speed;
  const totalDwellSeconds = count * dwellPerCheckpoint;
  return {
    walkingSeconds,
    dwellSeconds: totalDwellSeconds,
    totalSeconds: walkingSeconds + totalDwellSeconds,
  };
}

function finiteAtLeast(value, minimum, path) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < minimum) {
    throw new TypeError(`${path}: must be a finite number at least ${minimum}`);
  }
  return number;
}
