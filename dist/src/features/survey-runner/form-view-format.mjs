// FEATURE:      Runner setup display formatting
// SURFACE:      Preflight metrics, reason text, and duration formatting
// WHY TOGETHER: Setup rendering shares one null-safe formatting boundary.
// STATE:        None
// RULES:        Missing evidence renders plainly and never invents values.
// PROVENANCE:   Runner setup and preflight interface

export function preflightMetrics(sample, nowMs = Date.now()) {
  const fix = sample?.normalized;
  const fixMs = Date.parse(fix?.fixTime);
  return {
    position: fix
      ? `${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}`
      : "No position",
    floor: fix ? String(fix.z) : "—",
    age: Number.isFinite(fixMs)
      ? `${Math.max(0, Math.round((nowMs - fixMs) / 1000))} s`
      : "—",
    rtt: Number.isFinite(sample?.roundTripMs)
      ? `${sample.roundTripMs} ms`
      : "—",
  };
}

export function preflightReasonText(preflight) {
  return preflight.reasons.length
    ? preflight.reasons.map(reason => reason.text).join(" ")
    : "All preflight checks passed.";
}

export function formatDuration(seconds) {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return minutes
    ? `${minutes} min ${rounded % 60} s`
    : `${rounded} s`;
}
