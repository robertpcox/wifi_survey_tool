// FEATURE:      Report Player map floor synchronization
// SURFACE:      createMapFloorSync(options)
// WHY TOGETHER: Native floor observation, explicit commands, listeners, and cleanup share one state.
// STATE:        Current display floor, subscribers, and one adapter watcher cleanup
// RULES:        Native map state is authoritative; only explicit commands write a map floor.
// PROVENANCE:   Report field feedback for multi-floor result rendering

export function createMapFloorSync({
  adapter,
  initialFloor,
  onNativeChange,
}) {
  let floor = numericFloor(initialFloor);
  let stopWatch = null;
  const callbacks = new Set();

  function start(launchedFloor) {
    update(readMapFloor(launchedFloor));
    stop();
    stopWatch = adapter?.startZWatch?.(nativeChanged) ?? null;
    return floor;
  }

  function command(value, mapReady = false) {
    const nextFloor = numericFloor(value);
    if (nextFloor == null) return false;
    if (mapReady) adapter?.setMapZLevel?.(nextFloor);
    update(nextFloor);
    return true;
  }

  function nativeChanged(value) {
    if (!update(value)) return false;
    onNativeChange?.(floor);
    return true;
  }

  function update(value) {
    const nextFloor = numericFloor(value);
    if (nextFloor == null || nextFloor === floor) return false;
    floor = nextFloor;
    for (const callback of callbacks) callback(floor);
    return true;
  }

  function readMapFloor(launchedFloor) {
    try {
      const current = numericFloor(adapter?.getMapZLevel?.());
      if (current != null) return current;
    } catch {}
    return numericFloor(adapter?.currentZLevel)
      ?? numericFloor(launchedFloor)
      ?? floor;
  }

  function stop() {
    let stopped = false;
    if (typeof stopWatch === "function") stopped = stopWatch();
    else stopped = adapter?.stopZWatch?.() ?? false;
    stopWatch = null;
    return stopped;
  }

  function onChange(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Floor change callback must be a function.");
    }
    callbacks.add(callback);
    return () => callbacks.delete(callback);
  }

  function destroy() {
    stop();
    callbacks.clear();
  }

  return Object.freeze({
    command,
    destroy,
    onChange,
    start,
    stop,
    get floor() { return floor; },
  });
}

function numericFloor(value) {
  const floor = Number(value);
  return Number.isFinite(floor) ? floor : null;
}
