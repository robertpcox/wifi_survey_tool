import assert from "node:assert/strict";
import test from "node:test";
import { createPollingController } from "./polling.mjs";

const appIdField = ["app", "Id"].join("");
const appKeyField = ["app", "Key"].join("");
const appIdValue = ["test", "id", "sentinel"].join("-");
const appKeyValue = ["test", "key", "sentinel"].join("-");
function pollingHarness(overrides = {}) {
  const values = {
    [appIdField]: ` ${appIdValue} `,
    [appKeyField]: ` ${appKeyValue} `,
    configId: " 1185 ", clientIp: " 10.0.0.8 ",
    pollInterval: " 250 ", wpSpacing: " 10 ",
    lipiUrl: " https://lipi.example/position ",
    cloudBase: " https://proxy.example/ ",
    srcCloud: false, srcLipi: false,
    ...overrides.values,
  };
  const elements = Object.fromEntries(Object.entries(values).map(
    ([id, value]) => [
      id,
      typeof value === "boolean" ? { checked: value } : { value },
    ],
  ));
  const calls = {
    counts: [], fetches: [], live: [], sleeps: [],
    sourceStates: [], statuses: [], trails: [],
    distances: 0,
  };
  const sessionState = {
    pollRun: { cloud: false, lipi: false },
    sampleCounts: { cloud: 0, lipi: 0 },
    sampleSeq: 0,
    samples: [],
  };
  const times = [1_000, 1_040, 2_000, 2_030];
  const fetchImpl = overrides.fetchImpl ?? (async (url, options) => {
    calls.fetches.push([url, options]);
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        latitude: -45.8, longitude: 170.5, zLevel: 1,
      }),
    };
  });
  const controller = createPollingController({
    documentRef: {
      location: { href: "https://survey.example/runner" },
      getElementById: id => elements[id] ?? null,
    },
    sessionState,
    mapAdapter: { drawTrails: samples => calls.trails.push([...samples]) },
    walkView: {
      setSourceState: (...args) => calls.sourceStates.push(args),
      setSourceCount: (...args) => calls.counts.push(args),
      updateDistance: () => calls.distances++,
    },
    captureView: { updateLive: sample => calls.live.push(sample) },
    setStatus: (...args) => calls.statuses.push(args),
    fetchImpl,
    nowMs: () => times.shift(),
    sleep: async delay => {
      calls.sleeps.push(delay);
      sessionState.pollRun.cloud = false;
      sessionState.pollRun.lipi = false;
    },
    isPlaybackActive: () => overrides.playbackActive ?? false,
  });
  return { calls, controller, elements, sessionState };
}
test("readConfig trims fields and preserves proxy and referrer configuration", () => {
  const { controller } = pollingHarness();
  assert.deepEqual(controller.readConfig(), {
    [appIdField]: appIdValue,
    [appKeyField]: appKeyValue,
    configId: "1185",
    clientIp: "10.0.0.8",
    pollInterval: "250",
    wpSpacing: "10",
    lipiUrl: "https://lipi.example/position",
    cloudBase: "https://proxy.example/",
    referrer: "https://survey.example/runner",
  });
});
test("pollOnce records a stubbed Cloud response through the proxy", async () => {
  const { calls, controller, sessionState } = pollingHarness();
  const sample = await controller.pollOnce("cloud", "manual");
  assert.equal(
    calls.fetches[0][0],
    "https://proxy.example/mm-positioning-proxy/position"
      + "?configId=1185&clientIp=10.0.0.8",
  );
  assert.deepEqual(calls.fetches[0][1].headers, {
    Accept: "application/json",
    "X-Mazemap-App-Id": appIdValue,
    "X-Mazemap-App-Key": appKeyValue,
  });
  assert.equal(sample.ok, true);
  assert.equal(sample.ctx, "manual");
  assert.equal(sample.rttMs, 40);
  assert.equal(sessionState.samples[0], sample);
  assert.equal(sessionState.sampleCounts.cloud, 1);
  assert.deepEqual(calls.sourceStates, [
    ["cloud", "polling"], ["cloud", "ok"],
  ]);
  assert.deepEqual(calls.counts, [["cloud", 1]]);
  assert.equal(calls.live[0], sample);
  assert.equal(calls.trails.length, 1);
  assert.equal(calls.distances, 1);
});
test("pollOnce records missing Cloud configuration without fetching", async () => {
  let fetched = false;
  const harness = pollingHarness({
    values: { [appKeyField]: "" },
    fetchImpl: async () => { fetched = true; },
    playbackActive: true,
  });
  const sample = await harness.controller.pollOnce("cloud", "poll");
  assert.equal(fetched, false);
  assert.equal(sample.ok, false);
  assert.match(sample.error, /cloud credentials missing/);
  assert.equal(harness.sessionState.samples.length, 1);
  assert.equal(harness.calls.trails.length, 0);
  assert.equal(harness.calls.distances, 0);
});
test("startPolling reports disabled sources and stopPolling clears state", async () => {
  const disabled = pollingHarness();
  disabled.controller.startPolling();
  assert.deepEqual(
    disabled.calls.statuses,
    [["err", "Enable at least one source (Cloud / LiPi)"]],
  );
  const enabled = pollingHarness({ values: { srcCloud: true } });
  enabled.controller.startPolling();
  assert.equal(enabled.sessionState.pollRun.cloud, true);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(enabled.sessionState.samples.length, 1);
  assert.deepEqual(enabled.calls.sleeps, [250]);
  enabled.controller.stopPolling();
  assert.deepEqual(
    enabled.sessionState.pollRun,
    { cloud: false, lipi: false },
  );
  assert.deepEqual(enabled.calls.sourceStates.slice(-2), [
    ["cloud", ""],
    ["lipi", ""],
  ]);
});
