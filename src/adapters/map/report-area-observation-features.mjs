// FEATURE:      Low-clutter raw Cisco area observation features
// SURFACE:      areaObservationFeatures(observation)
// WHY TOGETHER: One visit endpoint ring and its optional room connector share one verdict.
// STATE:        None
// RULES:        Never draw every catch-up state or corridor connector spaghetti.
// PROVENANCE:   Room/corridor area-resolution map

export function areaObservationFeatures(observation) {
  const target = observation.target;
  const shared = observationProperties(observation);
  const truth = pointFeature(target, {
    ...shared, markerRole: "expected-sample",
    verdict: observationVerdict(observation),
  });
  const representative = representativeMoment(observation);
  const cisco = representative?.moment?.point ? [pointFeature(
    representative.moment.point, {
      ...shared, markerRole: "cisco-position", phase: representative.phase,
      status: representative.moment.status,
      verdict: momentVerdict(representative.moment),
      representedSampleCount: representative.sampleCount,
      resolvedAreaId: representative.moment.room?.id ?? null,
      resolvedAreaName: representative.moment.room?.name ?? null,
    },
  )] : [];
  return { truth, cisco, line: driftLine(observation, representative, shared) };
}

function observationProperties(observation) {
  return {
    pairId: `area:${observation.resultId}:${observation.checkpointId}`,
    resultId: observation.resultId,
    checkpointId: observation.checkpointId,
    areaName: observation.expectedRoom?.name ?? observation.roomLabel,
    observationKind: observation.observationKind,
    status: observation.primary.status,
    visitStatus: observation.primary.status,
    visitVerdict: observation.tied ? "split"
      : (observation.scored ? (observation.resolved ? "inside" : "outside") : "unscored"),
    verdictBasis: observation.verdictBasis ?? null,
    windowSeconds: observation.windowSeconds ?? null,
    windowComplete: observation.windowComplete ?? null,
    windowEndMs: observation.windowEndMs ?? null,
  };
}

function representativeMoment(observation) {
  const samples = observation.moments?.length ? observation.moments : [observation.primary];
  const hasWindowExit = observation.observationKind === "dwell"
    && Object.hasOwn(observation, "windowExit");
  const moment = hasWindowExit
    ? observation.windowExit
    : (observation.primary?.point
      ? observation.primary : [...samples].reverse().find(item => item?.point));
  return moment ? {
    phase: observation.observationKind === "dwell" ? "end-window" : "sample",
    moment, sampleCount: samples.length,
  } : null;
}

function driftLine(observation, representative, shared) {
  const point = representative?.moment?.point;
  if (observation.observationKind === "corridor-point" || !point
      || momentVerdict(representative.moment) !== "outside"
      || Number(observation.target.z) !== Number(point.z)) return [];
  return [{
    type: "Feature",
    properties: {
      ...shared, z: observation.target.z,
      phase: representative.phase, verdict: "outside",
    },
    geometry: { type: "LineString", coordinates: [
      [observation.target.lng, observation.target.lat], [point.lng, point.lat],
    ] },
  }];
}

function observationVerdict(observation) {
  const moment = momentVerdict(observation.primary);
  if (["wrong-floor", "no-position", "unscored"].includes(moment)) return moment;
  if (observation.scored === true) return observation.resolved ? "inside" : "outside";
  if (observation.scored === false) return "unscored";
  return moment;
}

function momentVerdict(moment) {
  if (moment?.status === "resolved") return "inside";
  if (["wrong-room", "unresolved"].includes(moment?.status)) return "outside";
  if (moment?.status === "wrong-floor") return "wrong-floor";
  if (moment?.status === "no-displayed-fix") return "no-position";
  return "unscored";
}

function pointFeature(point, properties) {
  return {
    type: "Feature",
    properties: { ...properties, z: point.z },
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
  };
}
