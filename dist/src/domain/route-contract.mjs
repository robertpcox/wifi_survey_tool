export const CAMPUS_ID = 566;
export const ROUTE_FORMAT_VERSION = 2;
export const ROUTE_TOOL = "route_survey";

export const CHECKPOINT_RULES = Object.freeze({
  minimumGapM: 6,
  turnDegrees: 35,
});

export const SUPPORTED_SPACINGS_M = Object.freeze([5, 10, 15, 20, 30, 0]);

export const MAP_STYLE = Object.freeze({
  cloud: "#2563eb",
  lipi: "#9333ea",
  route: "#111827",
  waypointDone: "#16a34a",
  waypointPending: "#98a2b3",
  waypointSkipped: "#ef4444",
  waypointCurrent: "#f59e0b",
});

export const ROUTE_BUILD_CONCURRENCY = 4;
export const MAP_TRAIL_FIX_LIMIT = 300;
