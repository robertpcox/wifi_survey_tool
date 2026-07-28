import { normalizePositionOutcome } from "./source-contract.mjs";

export function createMazeMapCloudSource(options = {}) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const nowMs = options.nowMs ?? Date.now;
  const setTimer = options.setTimer ?? globalThis.setTimeout;
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  const timeoutMs = options.timeoutMs ?? 12000;
  let sequence = 0;

  async function poll(request) {
    const sentMs = nowMs();
    const controller = new AbortController();
    const timer = setTimer(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(positionUrl(request), {
        headers: {
          Accept: "application/json",
          "X-Mazemap-App-Id": request.appId,
          "X-Mazemap-App-Key": request.appKey,
        },
        signal: controller.signal,
      });
      const body = await response.text();
      const receivedMs = nowMs();
      const parsed = parseBody(body);
      const error = responseError(response, parsed);
      return normalizePositionOutcome({
        id: `poll-${++sequence}`,
        sourceId: "mazemap-cloud",
        sentAt: sentMs,
        receivedAt: receivedMs,
        httpStatus: response.status,
        success: response.ok && !parsed.error,
        raw: parsed.raw,
        error,
      });
    } catch (error) {
      const receivedMs = nowMs();
      const timedOut = error?.name === "AbortError";
      return normalizePositionOutcome({
        id: `poll-${++sequence}`,
        sourceId: "mazemap-cloud",
        sentAt: sentMs,
        receivedAt: receivedMs,
        httpStatus: 0,
        success: false,
        raw: null,
        error: timedOut
          ? `Positioning proxy timed out after ${timeoutMs} ms`
          : `Positioning proxy request failed: ${error?.message || error}`,
      });
    } finally {
      clearTimer(timer);
    }
  }

  return Object.freeze({ id: "mazemap-cloud", poll });
}

export function positionUrl(request) {
  const base = String(request.proxyBase || "").trim().replace(/\/+$/, "");
  if (!base) throw new Error("Positioning proxy base is required");
  const query = new URLSearchParams({
    configId: request.configId,
    clientIp: request.clientIp,
  });
  return `${base}/position?${query}`;
}

function parseBody(body) {
  try {
    return { raw: JSON.parse(body), error: null };
  } catch {
    return {
      raw: body,
      error: "Positioning proxy returned malformed JSON",
    };
  }
}

function responseError(response, parsed) {
  if (parsed.error) return parsed.error;
  if (!response.ok) return `Positioning proxy returned HTTP ${response.status}`;
  return null;
}
