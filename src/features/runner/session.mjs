import { CAMPUS_ID, ROUTE_FORMAT_VERSION } from "../../domain/route-contract.mjs";
import { normalizeStops } from "../../domain/route-model.mjs";
import { csvCell } from "../../shared/format.mjs";

export function buildSession(options) {
  const {
    routeState,
    sessionState,
    config = {},
    campusId = CAMPUS_ID,
    routeFormatVersion = ROUTE_FORMAT_VERSION,
    nowDate = () => new Date(),
  } = options;
  return {
    tool: "route_survey",
    version: routeFormatVersion,
    meta: {
      campusId,
      routeFormatVersion,
      configId: config.configId ?? "",
      clientIp: config.clientIp ?? "",
      lipiUrl: config.lipiUrl ?? "",
      intervalMs: Number(config.pollInterval),
      spacingM: Number(config.wpSpacing),
      exportedAt: nowDate().toISOString(),
      ...sessionState.meta,
    },
    stops: normalizeStops(routeState.stops),
    legs: routeState.legs,
    waypoints: routeState.waypoints,
    samples: sessionState.samples,
    events: sessionState.events,
  };
}

export function buildSessionCsv(sessionState) {
  const header = [
    "event", "source", "iso_sent", "ms_sent", "iso_recv", "ms_recv",
    "rtt_ms", "http", "lastSeen_ms", "iso_lastSeen", "latitude",
    "longitude", "zLevel", "x", "y", "confidenceFactor", "locationName",
    "wp_seq", "wp_kind", "wp_name", "leg", "wp_lat", "wp_lng", "wp_z",
    "note",
  ];
  const emptySource = Array(13).fill("");
  const emptyWaypoint = Array(7).fill("");
  const rows = [];
  for (const sample of sessionState.samples) {
    const data = sample.data || {};
    rows.push({
      t: sample.tSentMs,
      row: [
        "sample", sample.source, sample.isoSent, sample.tSentMs,
        sample.isoRecv ?? "", sample.tRecvMs ?? "", sample.rttMs ?? "",
        sample.http ?? "", data.lastSeen ?? "",
        typeof data.lastSeen === "number"
          ? new Date(data.lastSeen).toISOString()
          : "",
        data.latitude ?? "", data.longitude ?? "", data.zLevel ?? "",
        data.x ?? "", data.y ?? "", data.confidenceFactor ?? "",
        data.locationName ?? (sample.error ?? ""), ...emptyWaypoint, "",
      ],
    });
  }
  for (const event of sessionState.events) {
    rows.push({
      t: event.tMs,
      row: eventRow(event, emptySource),
    });
  }
  rows.sort((left, right) => left.t - right.t);
  return [header, ...rows.map(item => item.row)]
    .map(row => row.map(csvCell).join(","))
    .join("\n");
}

function eventRow(event, emptySource) {
  if (event.type === "checkin") {
    return [
      "checkin", "", event.iso, event.tMs, ...emptySource,
      event.wpSeq + 1, event.wpKind, event.wpName, event.legIdx,
      event.lat, event.lng, event.z, "",
    ];
  }
  return [
    event.type, "", event.iso, event.tMs, ...emptySource,
    event.wpSeq != null ? event.wpSeq + 1 : "",
    event.wpKind ?? "", event.wpName ?? "", event.legIdx ?? "",
    "", "", "", event.note ?? "",
  ];
}
