// FEATURE:      Campus overview area-resolution projection
// SURFACE:      overviewWithAreaResolutions(analysis, model, summaries)
// WHY TOGETHER: Room and zone summaries must enter the merged map without changing route evidence.
// STATE:        None
// RULES:        The singular areaResolution remains a room compatibility alias.
// PROVENANCE:   Consolidated MazeMap room and zone containment

export function overviewWithAreaResolutions(analysis, model, summaries) {
  const room = summaries?.room ?? null;
  const zone = summaries?.zone ?? null;
  if (!room && !zone) return {
    ...analysis,
    areaResolution: null,
    areaResolutions: { room: null, zone: null },
  };
  return {
    ...analysis,
    areaResolution: room,
    areaResolutions: { room, zone },
    fitPoints: [
      ...analysis.fitPoints,
      ...issuePoints(room),
      ...issuePoints(zone),
    ],
    heatmaps: {
      ...analysis.heatmaps,
      room: model.floors.map(floor => ({ ...floor, points: [] })),
    },
  };
}

function issuePoints(summary) {
  return [
    ...(summary?.truthIssuePoints ?? []),
    ...(summary?.ciscoIssuePoints ?? []),
  ];
}
