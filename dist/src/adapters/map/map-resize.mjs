// FEATURE:      Shared MazeMap resize lifecycle
// SURFACE:      resizeMapAfterLayout(map, scheduleFrame)
// WHY TOGETHER: Two-frame layout stabilization and one provider resize call form one lifecycle.
// STATE:        Promise for the scheduled resize
// RULES:        Resize only after two animation frames; feature code owns ResizeObserver.
// PROVENANCE:   Scope/steps/05a_recast_player.md map reveal/resize contract

export function resizeMapAfterLayout(map, scheduleFrame) {
  const schedule = scheduleFrame
    ?? globalThis.requestAnimationFrame
    ?? (callback => queueMicrotask(callback));
  return new Promise(resolve => schedule(() => schedule(() => {
    map?.resize?.();
    resolve(Boolean(map));
  })));
}
