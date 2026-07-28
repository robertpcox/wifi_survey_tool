// FEATURE:      MazeMap launch failure boundary
// SURFACE:      MazeMapLaunchError, classifyMazeMapLaunchError(error, phase)
// WHY TOGETHER: Conservative classification and safe cause details define one error contract.
// STATE:        None
// RULES:        Only structured 401/403 evidence may request access; redact provider details.
// PROVENANCE:   Scope/steps/05a_recast_player.md public-first MazeMap contract

export const MAP_LAUNCH_CLASSIFICATIONS = Object.freeze({
  ACCESS_DENIED: "access-denied",
  SDK_LOAD: "sdk-load",
  NETWORK: "network",
  TIMEOUT: "timeout",
  TILES: "tiles",
  GENERIC: "generic",
  UNKNOWN: "unknown",
});

const COPY_FIELDS = [
  "name", "message", "code", "status", "statusCode", "sourceId", "url",
];

export class MazeMapLaunchError extends Error {
  constructor(classification, { cause, details, phase = "unknown" } = {}) {
    super(classificationMessage(classification), { cause });
    this.name = "MazeMapLaunchError";
    this.classification = classification;
    this.code = `MAZEMAP_${classification.replaceAll("-", "_").toUpperCase()}`;
    this.phase = phase;
    this.promptForAccess = classification === "access-denied";
    this.useFallback = true;
    this.details = Object.freeze(safeDetails(details ?? cause));
  }
}

export function classifyMazeMapLaunchError(error, phase = "unknown", details) {
  if (error instanceof MazeMapLaunchError) return error;
  const classification = classificationFor(error, phase);
  return new MazeMapLaunchError(classification, { cause: error, details, phase });
}

function classificationFor(error, phase) {
  if (provedAccessDenial(error, phase)) {
    return MAP_LAUNCH_CLASSIFICATIONS.ACCESS_DENIED;
  }
  const codes = nestedValues(error, ["code"]).map(value => String(value).toUpperCase());
  const names = nestedValues(error, ["name"]).map(String);
  if (codes.some(code => ["ETIMEDOUT", "ESOCKETTIMEDOUT", "MAZEMAP_TIMEOUT"].includes(code))
      || names.includes("TimeoutError")) {
    return MAP_LAUNCH_CLASSIFICATIONS.TIMEOUT;
  }
  if (phase === "sdk-load") return MAP_LAUNCH_CLASSIFICATIONS.SDK_LOAD;
  if (phase === "map-load" && (codes.some(code => [
    "ECONNRESET", "ECONNREFUSED", "ENETDOWN", "ENETUNREACH", "EHOSTUNREACH",
  ].includes(code)) || names.includes("NetworkError") || names.includes("TypeError"))) {
    return MAP_LAUNCH_CLASSIFICATIONS.NETWORK;
  }
  const sourceIds = nestedValues(error, ["sourceId", "sourceType"])
    .map(value => String(value).toLowerCase());
  if (sourceIds.some(value => value.includes("tile"))) {
    return MAP_LAUNCH_CLASSIFICATIONS.TILES;
  }
  return error && typeof error === "object"
    ? MAP_LAUNCH_CLASSIFICATIONS.GENERIC
    : MAP_LAUNCH_CLASSIFICATIONS.UNKNOWN;
}

function provedAccessDenial(error, phase) {
  if (phase !== "map-load") return false;
  const status = error?.error?.response?.status;
  return Number.isInteger(status) && (status === 401 || status === 403);
}

function nestedValues(value, fields, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  const found = fields.flatMap(field => value[field] == null ? [] : [value[field]]);
  for (const key of ["error", "cause", "response", "details", "source"]) {
    found.push(...nestedValues(value[key], fields, seen));
  }
  return found;
}

function safeDetails(value) {
  if (!value || typeof value !== "object") {
    return { value: redact(String(value ?? "")) };
  }
  const details = {};
  for (const field of COPY_FIELDS) {
    if (value[field] != null) details[field] = redact(String(value[field]));
  }
  const nested = value.error ?? value.cause;
  if (nested && nested !== value) {
    const safeNested = safeDetails(nested);
    if (Object.keys(safeNested).length) details.cause = safeNested;
  }
  return details;
}

function redact(value) {
  return value
    .replace(/([?&#](?:token|key|access|authorization)=)[^&#\s]+/gi, "$1[redacted]")
    .replace(/\b(token|key|access|authorization)=\S+/gi, "$1=[redacted]")
    .replace(/\bBearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(https?:\/\/[^\s?#]+)[?#][^\s]*/gi, "$1?[redacted]");
}

function classificationMessage(classification) {
  return {
    "access-denied": "MazeMap denied access to this campus.",
    "sdk-load": "The MazeMap SDK could not be loaded.",
    network: "MazeMap could not be reached over the network.",
    timeout: "MazeMap did not become ready before the timeout.",
    tiles: "MazeMap loaded but its map tiles failed.",
    generic: "MazeMap could not be launched.",
    unknown: "MazeMap failed for an unknown reason.",
  }[classification];
}
