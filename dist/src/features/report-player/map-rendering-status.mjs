// FEATURE:      Report map rendering feedback
// SURFACE:      createMapRenderingStatus(options)
// WHY TOGETHER: Visible busy state, next-paint release, and overlapping work share one token set.
// STATE:        Active rendering tokens and their latest user-facing message
// RULES:        Older completions never clear newer work; every completed state survives one paint.
// PROVENANCE:   Consolidated report rendering feedback

export function createMapRenderingStatus({
  element,
  mapElement,
  requestAnimationFrameRef = globalThis.requestAnimationFrame,
}) {
  const active = new Map();
  const paint = requestAnimationFrameRef
    ? () => new Promise(resolve => requestAnimationFrameRef(resolve))
    : () => Promise.resolve();
  const paintBoundary = async () => { await paint(); await paint(); };

  function sync() {
    if (!element) return;
    const busy = active.size > 0;
    if (busy) element.textContent = [...active.values()].at(-1);
    element.hidden = !busy;
    if (busy) mapElement?.setAttribute?.("aria-busy", "true");
    else mapElement?.removeAttribute?.("aria-busy");
  }

  function begin(message = "Rendering map…") {
    if (!element) return null;
    const token = Symbol("map-render");
    active.set(token, message);
    sync();
    return token;
  }

  async function complete(token, work = undefined) {
    if (!token) return work;
    try {
      if (work !== undefined) return await work;
      return work;
    } finally {
      await paintBoundary();
      active.delete(token);
      sync();
    }
  }

  async function run(message, work) {
    const token = begin(message);
    if (!token) return work();
    await paintBoundary();
    return complete(token, Promise.resolve().then(work));
  }

  return Object.freeze({
    begin,
    complete,
    run,
    destroy() { active.clear(); sync(); },
    get busy() { return active.size > 0; },
  });
}
