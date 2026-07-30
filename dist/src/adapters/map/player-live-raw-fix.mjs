// FEATURE:      Player live raw IPS evidence
// SURFACE:      liveRawFixFeature(frame, rawFix, walker)
// WHY TOGETHER: Reported floor, current display floor, and wrong-floor state describe one fix.
// STATE:        None
// RULES:        Preserve captured coordinates and z while displaying beside the baseline walker.
// PROVENANCE:   Scope/steps/05a_recast_player.md raw-provider-evidence contract

import { geoPoint } from "./map-geojson.mjs";

export function liveRawFixFeature(frame, rawFix, walker) {
  if (!rawFix) return null;
  const evidence = frame?.pollEvidence?.latestRawFix;
  const currentFloorMismatch = walker
    ? rawFix.z !== walker.z
    : false;
  const wrongFloor = currentFloorMismatch || evidence?.floorMatch === false;
  return geoPoint(rawFix, {
    role: "raw-fix",
    displayZ: walker?.z ?? rawFix.z,
    reportedZ: rawFix.z,
    floorMatch: !wrongFloor,
    wrongFloor,
    pollId: evidence?.pollId ?? null,
  }, "raw-fix");
}
