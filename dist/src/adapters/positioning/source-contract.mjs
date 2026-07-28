export const POSITION_SOURCES = Object.freeze(["cloud", "lipi"]);
export const V3_POSITION_SOURCES = Object.freeze(["mazemap-cloud"]);

export function assertPositionSourceAdapter(adapter) {
  if (!V3_POSITION_SOURCES.includes(adapter?.id)) {
    throw new TypeError(`Unsupported v3 position source: ${adapter?.id}`);
  }
  if (typeof adapter.poll !== "function") {
    throw new TypeError("Position source adapter must expose poll(request)");
  }
  return adapter;
}

export function normalizePositionOutcome({
  id,
  sourceId,
  sentAt,
  receivedAt,
  httpStatus,
  success,
  raw,
  error = null,
}) {
  if (!V3_POSITION_SOURCES.includes(sourceId)) {
    throw new TypeError(`Unsupported v3 position source: ${sourceId}`);
  }
  const sentMs = timestampMs(sentAt);
  const receivedMs = timestampMs(receivedAt);
  const hasPosition = Number.isFinite(raw?.latitude)
    && Number.isFinite(raw?.longitude)
    && Number.isFinite(raw?.zLevel);
  return {
    id,
    sourceId,
    sentAt: new Date(sentMs).toISOString(),
    receivedAt: new Date(receivedMs).toISOString(),
    roundTripMs: receivedMs - sentMs,
    httpStatus,
    success: Boolean(success && hasPosition),
    normalized: hasPosition ? {
      lat: raw.latitude,
      lng: raw.longitude,
      z: raw.zLevel,
      fixTime: normalizeFixTime(raw.lastSeen),
      confidence: Number.isFinite(raw.confidenceFactor)
        ? raw.confidenceFactor
        : null,
    } : null,
    raw,
    error: error ? String(error) : null,
  };
}

function timestampMs(value) {
  const milliseconds = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError("Invalid position sample timestamp");
  return milliseconds;
}

function normalizeFixTime(value) {
  if (value === null || value === undefined) return null;
  const milliseconds = timestampMs(value);
  return new Date(milliseconds).toISOString();
}

export function beginPositionSample(id, source, context, sentAtMs) {
  return {
    id,
    source,
    ctx: context,
    tSentMs: sentAtMs,
    isoSent: new Date(sentAtMs).toISOString(),
    tRecvMs: null,
    isoRecv: null,
    rttMs: null,
    http: null,
    ok: false,
    data: null,
    error: null,
  };
}

export async function finishPositionSample(sample, response, receivedAt) {
  const text = await response.text();
  const receivedAtMs = typeof receivedAt === "function"
    ? receivedAt()
    : receivedAt;
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  const finished = {
    ...sample,
    tRecvMs: receivedAtMs,
    isoRecv: new Date(receivedAtMs).toISOString(),
    rttMs: receivedAtMs - sample.tSentMs,
    http: response.status,
    data,
  };
  finished.ok = response.ok
    && typeof data?.latitude === "number"
    && typeof data?.longitude === "number";
  return finished;
}

export function failPositionSample(sample, error, receivedAtMs) {
  return {
    ...sample,
    tRecvMs: receivedAtMs,
    isoRecv: new Date(receivedAtMs).toISOString(),
    rttMs: receivedAtMs - sample.tSentMs,
    error: error.message,
  };
}
