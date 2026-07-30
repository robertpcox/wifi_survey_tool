// FEATURE:      Dynamic room multi-device polling
// SURFACE:      createDynamicDevicePolling(options), combineDynamicPollLoops(primary, devices)
// WHY TOGETHER: Extra-device poll loops must start, stop, and record with the primary loop.
// STATE:        Per-device poll streams owned by one dynamic run
// RULES:        Device poll ids stay namespaced and sequential; the primary stream is untouched.
// PROVENANCE:   Dynamic room multi-device capture request

import { createRunnerPollLoop } from "./poll-loop.mjs";
import { runnerPositionRequest } from "./entry.mjs";

export function createDynamicDevicePolling(options) {
  const devices = options.devices ?? [];
  if (!devices.length) return null;
  const streams = devices.map(device => deviceStream(device, options));
  return Object.freeze({
    streams,
    start() {
      for (const stream of streams) stream.loop.start();
    },
    stop() {
      for (const stream of streams) stream.loop.stop();
    },
  });
}

function deviceStream(device, options) {
  const polls = [];
  let sequence = 0;
  const loop = createRunnerPollLoop({
    source: options.source,
    intervalMs: options.definition.meta.sourceConfig.pollIntervalMs,
    request: () => ({
      ...runnerPositionRequest(
        options.definition,
        options.entry,
        options.credentials,
      ),
      clientIp: device.clientIp,
    }),
    onSample(sample) {
      polls.push({ ...sample, id: `poll-${device.slug}-${++sequence}` });
    },
    setTimer: options.setTimer,
    clearTimer: options.clearTimer,
  });
  return {
    label: device.label,
    clientIp: device.clientIp,
    slug: device.slug,
    polls,
    loop,
  };
}

export function combineDynamicPollLoops(primary, devicePolling) {
  if (!devicePolling) return primary;
  return Object.freeze({
    get active() {
      return primary.active;
    },
    intervalMs: primary.intervalMs,
    sampleOnce: (...args) => primary.sampleOnce(...args),
    start() {
      primary.start();
      devicePolling.start();
    },
    stop() {
      primary.stop();
      devicePolling.stop();
    },
  });
}
