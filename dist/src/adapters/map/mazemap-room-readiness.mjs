// FEATURE:      Authenticated MazeMap room-catalogue readiness
// SURFACE:      createMazeMapRoomReadiness(options), waitForRenderedMazeMap(options)
// WHY TOGETHER: Token ownership, loaded-map identity, and post-fit rendering gate one POI query.
// STATE:        Current private launch revision and its loaded map
// RULES:        Building discovery cannot run on public, loading, moving, or superseded maps.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

export function createMazeMapRoomReadiness({
  scheduleFrame,
  timeoutMs = 10000,
} = {}) {
  let authenticated = false;
  let map = null;
  let revision = 0;
  return Object.freeze({
    begin(token) {
      revision += 1;
      authenticated = Boolean(String(token ?? "").trim());
      map = null;
    },
    loaded(nextMap) { map = nextMap; },
    fail() { map = null; },
    async wait() {
      if (!authenticated || !map) {
        throw new Error(
          "MazeMap room data requires a loaded authenticated map.",
        );
      }
      const expectedMap = map;
      const expectedRevision = revision;
      await waitForRenderedMazeMap({
        map: expectedMap, scheduleFrame, timeoutMs,
      });
      if (map !== expectedMap || revision !== expectedRevision) {
        throw new Error("MazeMap room-data request was superseded by a map relaunch.");
      }
    },
  });
}

export async function waitForRenderedMazeMap({ map, scheduleFrame, timeoutMs = 10000 }) {
  if (map?.isMoving?.() === true) await waitForIdle(map, timeoutMs);
  const frame = scheduleFrame
    ?? globalThis.requestAnimationFrame
    ?? (callback => queueMicrotask(callback));
  await new Promise(resolve => frame(() => frame(resolve)));
}

function waitForIdle(map, timeoutMs) {
  if (typeof map.once !== "function") return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(
      new Error(`MazeMap did not finish rendering within ${timeoutMs} ms`),
    ), timeoutMs);
    map.once("idle", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}
