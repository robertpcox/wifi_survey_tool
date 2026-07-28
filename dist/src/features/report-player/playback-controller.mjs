// FEATURE:      Report Player playback
// SURFACE:      createPlaybackController(options)
// WHY TOGETHER: Clock, seek, speed, and frame emission form one deterministic playback state machine.
// STATE:        Current playback time, speed, and timer handle
// RULES:        Clamp to run bounds and derive every frame from the shared result object.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { playbackBounds, playbackFrame } from "../../domain/report-playback.mjs";

export function createPlaybackController({
  result,
  onFrame = () => {},
  setIntervalRef = globalThis.setInterval,
  clearIntervalRef = globalThis.clearInterval,
  tickMs = 100,
}) {
  const bounds = playbackBounds(result);
  let atMs = bounds.startMs;
  let speed = 1;
  let timer = null;

  function emit() {
    const frame = playbackFrame(result, atMs);
    onFrame(frame);
    return frame;
  }

  function seek(value) {
    atMs = Math.min(bounds.endMs, Math.max(bounds.startMs, Number(value)));
    return emit();
  }

  function setSpeed(value) {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) throw new Error("Playback speed must be positive");
    speed = next;
    return speed;
  }

  function pause() {
    if (timer !== null) clearIntervalRef(timer);
    timer = null;
  }

  function play() {
    if (timer !== null) return;
    timer = setIntervalRef(() => {
      atMs += tickMs * speed;
      if (atMs >= bounds.endMs) {
        atMs = bounds.endMs;
        pause();
      }
      emit();
    }, tickMs);
  }

  function reset() {
    pause();
    return seek(bounds.startMs);
  }

  emit();
  return Object.freeze({
    bounds,
    pause,
    play,
    reset,
    seek,
    setSpeed,
    get playing() { return timer !== null; },
  });
}
