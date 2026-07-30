// FEATURE:      Creator route review
// SURFACE:      Route metrics and individual checkpoint dwell updates
// WHY TOGETHER: Both operations recalculate duration from the same immutable route snapshot.
// STATE:        Current Creator route
// RULES:        Duration always sums explicit checkpoint dwell with legacy fallback.
// PROVENANCE:   Scope/steps/03_build_creator.md

import { replaceCreatorCheckpointDwell } from "./checkpoint-dwell.mjs";

export function creatorRouteResult(
  domain,
  legs,
  checkpoints,
  shortLegs,
  legacyDwellSeconds = 0,
) {
  const distanceM = legs.reduce((sum, leg) => sum + leg.distanceM, 0);
  return {
    stale: false,
    legs,
    checkpoints,
    legacyDwellSeconds,
    shortLegs,
    distanceM,
    duration: domain.estimateRouteDuration({
      distanceM,
      checkpoints,
      checkpointCount: checkpoints.length,
      dwellSeconds: legacyDwellSeconds,
    }),
  };
}

export function updateCreatorRouteDwell(
  domain,
  route,
  sequence,
  dwellSeconds,
) {
  return creatorRouteResult(
    domain,
    route.legs,
    replaceCreatorCheckpointDwell(
      route.checkpoints,
      sequence,
      dwellSeconds,
    ),
    route.shortLegs,
    route.legacyDwellSeconds ?? 0,
  );
}
