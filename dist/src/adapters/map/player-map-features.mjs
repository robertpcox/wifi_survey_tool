// FEATURE:      Full-screen Player map evidence
// SURFACE:      buildPlayerFeatureCollections(frame, snap)
// WHY TOGETHER: One deterministic frame becomes the complete provider-neutral GeoJSON evidence set.
// STATE:        None
// RULES:        Failed polls never become raw fixes; snap overlays never mutate captured evidence.
// PROVENANCE:   Scope/contracts/report_analysis.md playback poll-map evidence
import { geoCircle, geoPath, geoPoint, validMapPoint } from "./map-geojson.mjs";
import { playerChangedFixHistory } from "./player-fix-history.mjs";
import { liveRawFixFeature } from "./player-live-raw-fix.mjs";
import { notePointFeatures } from "./note-features.mjs";
export function buildPlayerFeatureCollections(frame = {}, snap = {}) {
  snap = snap ?? {};
  const evidence = frame.evidence ?? frame.mapEvidence ?? frame.pollEvidence ?? {};
  const walker = mapPoint(frame.walker);
  const rawFix = mapPoint(
    frame.rawFix
      ?? frame.liveRawFix
      ?? frame.pollEvidence?.latestRawFix?.fix
      ?? frame.latestFix,
  );
  const history = playerChangedFixHistory(frame);
  const requests = list(evidence.requests ?? evidence.inFlight ?? frame.requests);
  const spans = list(
    evidence.requestSpans ?? evidence.spans ?? evidence.inFlight ?? frame.requestSpans,
  );
  const failures = list(evidence.failures ?? frame.failures);
  const outcomes = list(evidence.outcomes ?? frame.outcomes);
  const pairs = list(evidence.pairs ?? frame.pairs ?? outcomes);
  const snapRaw = mapPoint(snap.raw ?? rawFix);
  const candidate = mapPoint(snap.candidate ?? snap.point);
  const snapProps = {
    accepted: Boolean(snap.accepted),
    distanceM: finiteOrNull(snap.distanceM ?? snap.measuredDistanceM),
  };
  return Object.freeze({
    "player-walker": compact([geoPoint(walker, { role: "walker" }, "walker")]),
    "player-notes": notePointFeatures(frame.notes),
    "player-raw-fix": compact([liveRawFixFeature(frame, rawFix, walker)]),
    "player-fix-history": history.map((item, index) => (
      geoPoint(item.point, evidenceProps(item.value, { role: "changed-fix" }), `fix:${index}`)
    )).filter(Boolean),
    "player-fix-trail": geoPath(
      history.map(item => item.point),
      { role: "changed-fix-trail" },
      "fix-trail",
    ),
    "player-request-spans": spans.flatMap((item, index) => geoPath(
      pathOf(item),
      evidenceProps(item, { inFlight: item.inFlight !== false }),
      evidenceId(item, index),
    )),
    "player-request-rings": evidencePoints(
      requests, ["point", "routePoint", "sentPoint", "sentTruth"],
    ),
    "player-failures": evidencePoints(
      failures, ["point", "routePoint", "sentPoint", "markerTruth"],
    ),
    "player-outcomes": evidencePoints(
      outcomes, ["point", "routePoint", "receivedPoint", "routeEstimate"],
    ),
    "player-ips-pairs": pairs.map((item, index) => geoPoint(
      pointFrom(item, ["ipsPoint", "rawPoint", "fix", "normalized", "rawFix"]),
      evidenceProps(item, { role: "ips-pair" }),
      evidenceId(item, index),
    )).filter(Boolean),
    "player-pair-connectors": pairConnectors(pairs),
    "player-snap-candidate": compact([
      geoPoint(candidate, { ...snapProps, role: "snap-candidate" }, "snap-candidate"),
    ]),
    "player-snap-connector": snapRaw && candidate && snapRaw.z === candidate.z
      ? geoPath([snapRaw, candidate], snapProps, "snap-connector")
      : [],
    "player-snap-radius": compact([
      geoCircle(
        snapRaw,
        snap.radiusM,
        { ...snapProps, role: "snap-radius" },
        "snap-radius",
      ),
    ]),
  });
}
function pairConnectors(pairs) {
  return pairs.flatMap((item, index) => {
    const route = pointFrom(
      item, ["routePoint", "point", "receivedPoint", "routeEstimate"],
    );
    const ips = pointFrom(
      item, ["ipsPoint", "rawPoint", "fix", "normalized", "rawFix"],
    );
    if (!route || !ips || route.z !== ips.z || item.floorMatch === false) return [];
    return geoPath(
      [route, ips],
      evidenceProps(item, { role: "pair-connector" }),
      evidenceId(item, index),
    ).map(feature => ({ ...feature, id: evidenceId(item, index) }));
  });
}
function evidencePoints(values, keys) {
  return values.map((item, index) => geoPoint(
    pointFrom(item, keys),
    evidenceProps(item),
    evidenceId(item, index),
  )).filter(Boolean);
}
function evidenceProps(value, extra = {}) {
  const pollId = value?.pollId ?? value?.id ?? null;
  return {
    pairId: value?.pairId ?? pollId,
    pollId,
    status: value?.status ?? null,
    failureKind: value?.failureKind ?? null,
    outcome: value?.outcome ?? null,
    inFlight: Boolean(value?.inFlight),
    ...extra,
  };
}
function evidenceId(value, index) {
  return String(value?.pollId ?? value?.id ?? value?.pairId ?? index);
}
function pointFrom(value, keys) {
  for (const key of keys) {
    const point = mapPoint(value?.[key]);
    if (point) return point;
  }
  return mapPoint(value);
}
function mapPoint(value) {
  const point = value?.normalized ?? value;
  return validMapPoint(point)
    ? { lng: Number(point.lng), lat: Number(point.lat), z: Number(point.z) }
    : null;
}
function pathOf(value) {
  const direct = value?.points ?? value?.path ?? value?.geometry;
  if (Array.isArray(direct)) return direct;
  const span = value?.routeSpan ?? value;
  const segments = span?.segments;
  if (Array.isArray(segments)) {
    return segments.flatMap((segment, index) => (
      index ? [segment.to] : [segment.from, segment.to]
    ));
  }
  return [span?.start, span?.end].filter(Boolean);
}
const list = value => Array.isArray(value) ? value : [];
const compact = values => values.filter(Boolean);
function finiteOrNull(value) {
  return Number.isFinite(Number(value)) ? Number(value) : null;
}
