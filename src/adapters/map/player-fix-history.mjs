// FEATURE:      Player changed-fix history
// SURFACE:      playerChangedFixHistory(frame)
// WHY TOGETHER: Fix identity precedence and deterministic history reduction are one evidence rule.
// STATE:        None
// RULES:        Valid provider fix time wins; otherwise exact lng/lat/z identity is used.
// PROVENANCE:   Scope/contracts/report_analysis.md playback fix-identity contract

import { validMapPoint } from "./map-geojson.mjs";

export function playerChangedFixHistory(frame = {}) {
  const explicit = frame.changedFixHistory ?? frame.fixHistory;
  const values = Array.isArray(explicit) ? explicit : list(frame.polls)
    .filter(poll => poll?.success && validMapPoint(poll.normalized));
  const changed = [];
  let previousIdentity = null;
  for (const value of values) {
    const rawPoint = value?.normalized ?? value;
    if (!validMapPoint(rawPoint)) continue;
    const point = {
      lng: Number(rawPoint.lng),
      lat: Number(rawPoint.lat),
      z: Number(rawPoint.z),
    };
    const identity = fixIdentity(value, point);
    if (identity === previousIdentity) continue;
    changed.push({ point, value });
    previousIdentity = identity;
  }
  return changed;
}

function fixIdentity(value, point) {
  const fixTime = value?.fixTime ?? value?.normalized?.fixTime;
  return Number.isFinite(Date.parse(fixTime))
    ? `time:${fixTime}`
    : `position:${point.lng},${point.lat},${point.z}`;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}
