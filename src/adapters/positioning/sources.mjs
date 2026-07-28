import { fetchCloudPosition } from "./cloud.mjs";
import { fetchLipiPosition } from "./lipi.mjs";

export async function fetchPositionSource(source, config, options = {}) {
  const abortController = new AbortController();
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const timeoutMs = options.timeoutMs ?? 12000;
  const timer = setTimer(() => abortController.abort(), timeoutMs);
  try {
    const sourceOptions = {
      fetchImpl: options.fetchImpl,
      signal: abortController.signal,
    };
    if (source === "cloud") {
      return await fetchCloudPosition(config, sourceOptions);
    }
    return await fetchLipiPosition(config, sourceOptions);
  } finally {
    clearTimer(timer);
  }
}
