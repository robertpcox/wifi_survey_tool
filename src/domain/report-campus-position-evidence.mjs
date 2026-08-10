// FEATURE:      Consolidated Cisco walking positions
// SURFACE:      campusCiscoWalkingEvidence(analysis)
// WHY TOGETHER: Held-fix duration and moving lag must map to the unsnapped Cisco coordinate.
// STATE:        None
// RULES:        Walking only; preserve reported lng/lat/z and reviewed analysis coverage.
// PROVENANCE:   Long-corridor consolidated diagnostics

export function campusCiscoWalkingEvidence(analysis) {
  const fixes = new Map((analysis?.timeline ?? [])
    .filter(sample => finitePoint(sample.fix))
    .map(sample => [sample.pollId, sample.fix]));
  const held = (analysis?.heatmaps?.sticky ?? []).flatMap(floor => (
    (floor.points ?? []).flatMap(point => {
      const fix = fixes.get(point.pollId);
      const seconds = Number(point.weightSeconds);
      return fix && Number.isFinite(seconds) && seconds > 0
        ? [{ point: { ...fix }, seconds, pollId: point.pollId }] : [];
    })
  ));
  const lag = (analysis?.fixes?.lagSeries ?? []).flatMap(sample => {
    const fix = fixes.get(sample.pollId);
    const lagBehindM = Number(sample.lagBehindM);
    return sample.moving && fix && Number.isFinite(lagBehindM) && lagBehindM > 0
      ? [{ point: { ...fix }, lagBehindM, pollId: sample.pollId }] : [];
  });
  return Object.freeze({ held, lag });
}

function finitePoint(point) {
  return [point?.lng, point?.lat, point?.z].every(Number.isFinite);
}
