// FEATURE:      MazeMap area-resolution summary
// SURFACE:      combineAreaResolutionSummaries(room, corridor)
// WHY TOGETHER: Room visits and corridor samples share map evidence but retain separate denominators.
// STATE:        None
// RULES:        Never collapse a corridor sample into the room-visit resolution rate.
// PROVENANCE:   Dynamic room and long-corridor area resolution

export function combineAreaResolutionSummaries(room, corridor) {
  return Object.freeze({
    ...room,
    corridor,
    areaObservations: [
      ...(room.observations ?? []),
      ...(corridor.observations ?? []),
    ],
    truthIssuePoints: [
      ...(room.truthIssuePoints ?? []),
      ...(corridor.truthIssuePoints ?? []),
    ],
    ciscoIssuePoints: [
      ...(room.ciscoIssuePoints ?? []),
      ...(corridor.ciscoIssuePoints ?? []),
    ],
  });
}
