// FEATURE:      Report Player playback
// SURFACE:      createPlaybackController(options)
// WHY TOGETHER: Clock, transport stepping, follow, and active-view emission form one playback state machine.
// STATE:        Current time, speed, follow choice, active mode, last frame, and timer handle
// RULES:        Leaving Player pauses and suppresses frame writes while preserving the selected time.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { playbackBounds, playbackFrame } from "../../domain/report-playback.mjs";

export function createPlaybackController({
  result,
  onFrame = () => {},
  setIntervalRef = globalThis.setInterval,
  clearIntervalRef = globalThis.clearInterval,
  tickMs = 100,
  active: initiallyActive = true,
}) {
  const bounds = playbackBounds(result);
  let atMs = bounds.startMs;
  let speed = 1;
  let follow = true;
  let active = initiallyActive;
  let timer = null;
  let lastFrame = playbackFrame(result, atMs);

  function emit() {
    lastFrame = playbackFrame(result, atMs);
    if (active) onFrame(lastFrame);
    return lastFrame;
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
    if (!active || timer !== null) return;
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

  function previousEvent() {
    return seek(stepTime("previous"));
  }

  function nextEvent() {
    return seek(stepTime("next"));
  }

  function stepTime(direction) {
    const direct = direction === "previous"
      ? lastFrame.previousEventMs
      : lastFrame.nextEventMs;
    if (Number.isFinite(direct)) return direct;
    const times = lastFrame.eventTimes ?? [];
    const candidates = direction === "previous"
      ? times.filter(value => value < atMs).reverse()
      : times.filter(value => value > atMs);
    return candidates[0] ?? (direction === "previous" ? bounds.startMs : bounds.endMs);
  }

  function setActive(value) {
    active = Boolean(value);
    if (!active) pause();
    else emit();
    return active;
  }

  function setFollow(value) {
    follow = Boolean(value);
    return follow;
  }

  function destroy() {
    active = false;
    pause();
  }

  if (active) emit();
  return Object.freeze({
    bounds,
    destroy,
    nextEvent,
    pause,
    play,
    previousEvent,
    reset,
    seek,
    setActive,
    setFollow,
    setSpeed,
    get active() { return active; },
    get atMs() { return atMs; },
    get follow() { return follow; },
    get frame() { return lastFrame; },
    get playing() { return timer !== null; },
  });
}
