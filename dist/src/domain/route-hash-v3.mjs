export function canonicalRoutePlanV3(plan) {
  const route = plan?.route ?? plan ?? {};
  const summary = plan?.meta?.route ?? {};
  return JSON.stringify(sortValue({
    stops: route.stops ?? plan?.stops,
    legs: route.legs ?? plan?.legs,
    checkpoints: route.checkpoints ?? plan?.checkpoints,
    checkpointSpacingM: plan?.checkpointSpacingM
      ?? route.checkpointSpacingM
      ?? summary.checkpointSpacingM,
    checkpointDwellSeconds: plan?.checkpointDwellSeconds
      ?? route.checkpointDwellSeconds
      ?? summary.checkpointDwellSeconds,
  }));
}

export async function hashRoutePlanV3(plan, cryptoRef = globalThis.crypto) {
  if (typeof cryptoRef?.subtle?.digest !== "function") {
    throw new TypeError("cryptoRef.subtle.digest: is required for SHA-256");
  }
  const bytes = new TextEncoder().encode(canonicalRoutePlanV3(plan));
  const digest = await cryptoRef.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .filter(key => value[key] !== undefined)
      .sort()
      .map(key => [key, sortValue(value[key])]),
  );
}
