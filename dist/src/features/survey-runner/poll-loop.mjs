import { assertPositionSourceAdapter } from "../../adapters/positioning/source-contract.mjs";

export function createRunnerPollLoop(options) {
  const source = assertPositionSourceAdapter(options.source);
  const intervalMs = Number(options.intervalMs);
  if (!(intervalMs > 0)) throw new TypeError("Definition polling interval is required");
  const setTimer = options.setTimer ?? globalThis.setTimeout;
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  let active = false;
  let generation = 0;
  let timer = null;

  async function sampleOnce(context = "capture") {
    const sample = await source.poll(options.request());
    options.onSample(sample, context);
    return sample;
  }

  function start() {
    if (active) return;
    active = true;
    const current = ++generation;
    void pollAndSchedule(current);
  }

  async function pollAndSchedule(current) {
    const sample = await source.poll(options.request());
    if (!active || current !== generation) return;
    options.onSample(sample, "capture");
    timer = setTimer(() => void pollAndSchedule(current), intervalMs);
  }

  function stop() {
    active = false;
    generation++;
    clearTimer(timer);
    timer = null;
  }

  return Object.freeze({
    get active() { return active; },
    intervalMs,
    sampleOnce,
    start,
    stop,
  });
}
