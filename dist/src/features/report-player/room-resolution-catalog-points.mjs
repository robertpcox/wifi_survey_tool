// FEATURE:      Room catalogue discovery points
// SURFACE:      cataloguePoints(observations)
// WHY TOGETHER: Truth and raw Cisco coordinates form one deduplicated building-discovery input.
// STATE:        None
// RULES:        Preserve exact coordinates; omit missing fixes and duplicate locations.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

export function cataloguePoints(observations) {
  const unique = new Map();
  for (const observation of observations) {
    addPoint(unique, observation?.target);
    const moments = observation?.moments?.length
      ? observation.moments : [observation?.entry, observation?.exit];
    for (const moment of moments) addPoint(unique, moment?.point);
  }
  return [...unique.values()];
}

function addPoint(unique, point) {
  if (![point?.lng, point?.lat].every(Number.isFinite)) return;
  unique.set(`${point.lng.toFixed(7)}:${point.lat.toFixed(7)}`, point);
}
