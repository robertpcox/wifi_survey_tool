import { fetchPositionSource } from "../../adapters/positioning/sources.mjs";
import {
  beginPositionSample,
  failPositionSample,
  finishPositionSample,
} from "../../adapters/positioning/source-contract.mjs";

export function createPollingController(options) {
  const {
    documentRef,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    setStatus,
    fetchImpl = globalThis.fetch,
    nowMs,
    sleep,
    isPlaybackActive,
  } = options;
  const element = id => documentRef?.getElementById(id);
  const value = id => element(id)?.value?.trim?.() ?? "";

  function readConfig() {
    return {
      appId: value("appId"),
      appKey: value("appKey"),
      configId: value("configId"),
      clientIp: value("clientIp"),
      pollInterval: value("pollInterval"),
      wpSpacing: value("wpSpacing"),
      lipiUrl: value("lipiUrl"),
      cloudBase: value("cloudBase"),
      referrer: documentRef?.location?.href,
    };
  }

  function startPolling() {
    startSource("cloud", Boolean(element("srcCloud")?.checked));
    startSource("lipi", Boolean(element("srcLipi")?.checked));
    if (!sessionState.pollRun.cloud && !sessionState.pollRun.lipi) {
      setStatus("err", "Enable at least one source (Cloud / LiPi)");
    }
  }

  function startSource(source, enabled) {
    if (!enabled || sessionState.pollRun[source]) return;
    sessionState.pollRun[source] = true;
    pollLoop(source);
  }

  function stopPolling() {
    sessionState.pollRun.cloud = false;
    sessionState.pollRun.lipi = false;
    walkView.setSourceState("cloud", "");
    walkView.setSourceState("lipi", "");
  }

  async function pollLoop(source) {
    while (sessionState.pollRun[source]) {
      const sample = await pollOnce(source, "poll");
      if (!sessionState.pollRun[source]) break;
      const delay = Number(value("pollInterval"));
      await sleep(delay > 0 ? delay : (sample.ok ? 150 : 3000));
    }
  }

  async function pollOnce(source, context) {
    walkView.setSourceState(source, "polling");
    let sample = beginPositionSample(
      sessionState.sampleSeq++,
      source,
      context,
      nowMs(),
    );
    try {
      validateCloudConfig(source);
      const response = await fetchPositionSource(source, readConfig(), {
        fetchImpl,
      });
      sample = await finishPositionSample(sample, response, nowMs);
      walkView.setSourceState(source, sample.ok ? "ok" : "err");
    } catch (error) {
      sample = failPositionSample(sample, error, nowMs());
      walkView.setSourceState(source, "err");
    }
    recordSample(sample);
    return sample;
  }

  function validateCloudConfig(source) {
    if (source !== "cloud") return;
    const config = readConfig();
    const complete = config.appId && config.appKey
      && config.configId && config.clientIp;
    if (!complete) {
      throw new Error(
        "cloud credentials missing (App ID / Key / Config ID / Client IP)",
      );
    }
  }

  function recordSample(sample) {
    sessionState.samples.push(sample);
    sessionState.sampleCounts[sample.source]++;
    walkView.setSourceCount(
      sample.source,
      sessionState.sampleCounts[sample.source],
    );
    captureView.updateLive(sample);
    if (isPlaybackActive()) return;
    mapAdapter.drawTrails?.(sessionState.samples);
    walkView.updateDistance();
  }

  return {
    pollOnce,
    readConfig,
    startPolling,
    stopPolling,
  };
}
