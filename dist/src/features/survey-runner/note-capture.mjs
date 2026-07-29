// FEATURE:      Runner incident-note capture
// SURFACE:      createRunnerNoteCapture(options)
// WHY TOGETHER: Pause, held position, route anchor, dwell timing, and resume form one note.
// STATE:        One open note plus completed notes on the active run
// RULES:        Note identity stays distinct from its immutable authored-route anchor.
// PROVENANCE:   Runner offline field feedback

export function createRunnerNoteCapture(options) {
  function open(trigger = "manual", sourceError = null) {
    if (options.state.completionStatus || options.state.note) return false;
    const id = `note-${options.state.notes.length + 1}`;
    options.state.note = {
      id,
      routeAnchor: createRouteAnchor(options.definition, options.state.progress),
      trigger,
      sourceError: sourceError || null,
      openedAt: options.nowIso(),
      position: cleanPoint(options.currentPosition?.()),
    };
    options.onPause?.();
    options.pollLoop.stop();
    focusHeldPosition();
    options.onRender(options.state);
    return true;
  }

  function place(position) {
    if (!options.state.note) return false;
    const point = cleanPoint(position);
    if (!point) return false;
    options.state.note.position = point;
    focusHeldPosition();
    options.onRender(options.state);
    return true;
  }

  function add(text) {
    const openNote = options.state.note;
    const note = String(text ?? "").trim();
    if (!openNote || !note || !openNote.position) return false;
    const resumedAt = options.nowIso();
    const saved = {
      id: openNote.id,
      routeAnchor: { ...openNote.routeAnchor },
      note,
      trigger: openNote.trigger,
      sourceError: openNote.sourceError,
      openedAt: openNote.openedAt,
      resumedAt,
      dwellSeconds: Math.max(
        0,
        (Date.parse(resumedAt) - Date.parse(openNote.openedAt)) / 1000,
      ),
      groundTruth: { ...openNote.position },
    };
    options.state.notes.push(saved);
    options.state.events.push({
      type: "capture-note",
      at: saved.openedAt,
      resumedAt,
      dwellSeconds: saved.dwellSeconds,
      noteId: saved.id,
      routeAnchor: { ...saved.routeAnchor },
    });
    resume();
    return saved;
  }

  function cancel() {
    if (!options.state.note) return false;
    resume();
    return true;
  }

  function resume() {
    options.state.note = null;
    options.pollLoop.start();
    options.onResume?.();
  }

  function focusHeldPosition() {
    const point = options.state.note?.position;
    if (!point) return;
    options.mapAdapter.setMapZLevel?.(point.z);
    options.mapAdapter.focusWaypoint?.({ ...point, label: "Note position" });
  }

  return Object.freeze({ add, cancel, open, place });
}

function cleanPoint(value) {
  const point = value?.normalized ?? value;
  if (![point?.lng, point?.lat, point?.z].every(Number.isFinite)) return null;
  return { lng: point.lng, lat: point.lat, z: point.z };
}

function createRouteAnchor(definition, progress) {
  const checkpoints = progress?.checkpoints ?? [];
  const target = checkpoints[progress?.currentIndex] ?? null;
  const completed = checkpoints.filter(checkpoint => checkpoint.state === "done");
  const last = completed.at(-1) ?? null;
  return {
    type: "checkpoint-interval",
    routeHash: definition?.route?.hash ?? definition?.meta?.route?.hash,
    fromCheckpointId: last?.id ?? null,
    toCheckpointId: target?.id ?? null,
    legId: connectingLegId(definition?.route?.legs, last, target),
  };
}

function connectingLegId(legs, from, to) {
  if (!from || !to || from.id === to.id) return null;
  const candidates = [to.legId, from.legId].filter(Boolean);
  const direct = (legs ?? []).find(leg => (
    leg.fromStopId === from.stopId && leg.toStopId === to.stopId
  ))?.id;
  return candidates.find(id => (legs ?? []).some(leg => leg.id === id))
    ?? direct
    ?? null;
}
