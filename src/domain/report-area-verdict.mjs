// FEATURE:      Area-resolution visit verdict
// SURFACE:      areaVisitVerdict(observation, moments), AREA_WINDOW_SECONDS
// WHY TOGETHER: Time-weighted room windows and single corridor samples define one-vote outcomes.
// STATE:        None
// RULES:        Rooms use at most 20 seconds; ties fail; zero dwells and no-fix windows are unscored.
// PROVENANCE:   Cisco lag-aware MazeMap area resolution

export const AREA_WINDOW_SECONDS = 20;
export const UNSCORED_AREA_STATUSES = new Set([
  "truth-unavailable", "lookup-unavailable", "insufficient-window",
]);

const VALID_RAW_STATUSES = new Set([
  "resolved", "wrong-room", "unresolved", "wrong-floor", "no-displayed-fix",
]);

export function areaVisitVerdict(observation, moments = []) {
  if (observation.observationKind === "corridor-point") {
    return sampleVerdict(moments[0]);
  }
  const window = roomWindow(observation, moments);
  if (observation.observationKind !== "dwell" || !(window.durationMs > 0)) {
    return outcome(insufficient(moments), window, 0, 0, 0, "insufficient-window");
  }
  const weighted = weightedMoments(moments, window.startMs, window.endMs);
  const valid = weighted.filter(item => VALID_RAW_STATUSES.has(item.verdict.status));
  const validMs = sumDuration(valid);
  const insideMs = sumDuration(valid.filter(item => item.verdict.status === "resolved"));
  const outsideMs = validMs - insideMs;
  if (!(validMs > 0)) {
    const primary = representative(weighted) ?? insufficient(moments);
    return outcome(primary, window, 0, 0, 0, "no-valid-fix");
  }
  const resolved = insideMs > outsideMs;
  const candidates = valid.filter(item => (
    resolved ? item.verdict.status === "resolved" : item.verdict.status !== "resolved"
  ));
  return outcome(
    representative(candidates)?.verdict ?? insufficient(moments),
    window, validMs, insideMs, outsideMs, "time-weighted-window",
  );
}

export function areaWindowMoments(observation, moments = []) {
  if (observation.observationKind !== "dwell") return moments;
  const window = roomWindow(observation, moments);
  const bounded = moments.filter(item => Number.isFinite(item?.atMs)
    && item.atMs >= window.startMs && item.atMs <= window.endMs);
  return bounded.length ? bounded : moments.slice(0, 1);
}

function sampleVerdict(primary) {
  const verdict = primary ?? insufficient([]);
  const valid = VALID_RAW_STATUSES.has(verdict.status);
  return Object.freeze({
    primary: verdict,
    verdictBasis: "corridor-sample",
    windowSeconds: 0,
    windowComplete: false,
    validEvidenceSeconds: null,
    insideEvidenceSeconds: null,
    outsideEvidenceSeconds: null,
    tied: false,
    scored: valid,
    resolved: verdict.status === "resolved",
  });
}

function outcome(primaryValue, window, validMs, insideMs, outsideMs, basis) {
  const primary = primaryValue?.verdict ?? primaryValue;
  const scored = VALID_RAW_STATUSES.has(primary?.status) && validMs > 0;
  return Object.freeze({
    primary,
    verdictBasis: basis,
    windowSeconds: seconds(window.durationMs),
    windowComplete: window.durationMs >= AREA_WINDOW_SECONDS * 1000,
    validEvidenceSeconds: seconds(validMs),
    insideEvidenceSeconds: seconds(insideMs),
    outsideEvidenceSeconds: seconds(outsideMs),
    tied: validMs > 0 && insideMs === outsideMs,
    scored,
    resolved: scored && insideMs > outsideMs,
  });
}

function roomWindow(observation, moments) {
  const firstAt = moments.find(item => Number.isFinite(item?.atMs))?.atMs;
  const startMs = finite(observation.startMs) ?? finite(firstAt);
  if (startMs == null) return { startMs: null, endMs: null, durationMs: 0 };
  const authoredEnd = finite(observation.endMs)
    ?? (Number(observation.dwellSeconds) > 0
      ? startMs + Number(observation.dwellSeconds) * 1000 : startMs);
  const endMs = Math.min(authoredEnd, startMs + AREA_WINDOW_SECONDS * 1000);
  return { startMs, endMs, durationMs: Math.max(0, endMs - startMs) };
}

function weightedMoments(moments, startMs, endMs) {
  const timed = moments.filter(item => Number.isFinite(item?.atMs))
    .slice().sort((left, right) => left.atMs - right.atMs);
  return timed.flatMap((verdict, index) => {
    const fromMs = Math.max(startMs, verdict.atMs);
    const nextMs = timed[index + 1]?.atMs ?? endMs;
    const toMs = Math.min(endMs, nextMs);
    return toMs > fromMs ? [{ verdict, fromMs, durationMs: toMs - fromMs }] : [];
  });
}

function representative(weighted) {
  const groups = new Map();
  for (const item of weighted) {
    const key = `${item.verdict.status}:${item.verdict.room?.id ?? ""}`;
    const group = groups.get(key) ?? { ...item, key, durationMs: 0 };
    group.durationMs += item.durationMs;
    if (item.fromMs >= group.fromMs) {
      group.fromMs = item.fromMs;
      group.verdict = item.verdict;
    }
    groups.set(key, group);
  }
  return [...groups.values()].sort((left, right) => (
    right.durationMs - left.durationMs || right.fromMs - left.fromMs
      || left.key.localeCompare(right.key)
  ))[0] ?? null;
}

function insufficient(moments) {
  const seed = moments.at(-1) ?? {};
  return Object.freeze({ ...seed, status: "insufficient-window" });
}

function sumDuration(values) {
  return values.reduce((total, item) => total + item.durationMs, 0);
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function seconds(value) {
  return Math.round(value) / 1000;
}
