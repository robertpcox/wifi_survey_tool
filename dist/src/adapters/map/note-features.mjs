// FEATURE:      Capture-note map features
// SURFACE:      notePointFeatures(notes)
// WHY TOGETHER: Report and Player require the same exact route-anchored note GeoJSON.
// STATE:        None
// RULES:        Note identity stays distinct from typed authored-route anchor properties.
// PROVENANCE:   Runner offline field feedback

export function notePointFeatures(notes) {
  return (notes ?? []).map(note => {
    const point = note?.groundTruth;
    const anchor = note?.routeAnchor ?? {};
    if (![point?.lng, point?.lat, point?.z].every(Number.isFinite)) return null;
    return {
      type: "Feature",
      id: note.id,
      properties: {
        z: point.z,
        noteId: note.id,
        anchorType: anchor.type ?? null,
        routeHash: anchor.routeHash ?? null,
        fromCheckpointId: anchor.fromCheckpointId ?? null,
        toCheckpointId: anchor.toCheckpointId ?? null,
        legId: anchor.legId ?? null,
        note: note.note,
        trigger: note.trigger,
        openedAt: note.openedAt,
        resumedAt: note.resumedAt,
        dwellSeconds: note.dwellSeconds,
        role: "capture-note",
      },
      geometry: {
        type: "Point",
        coordinates: [point.lng, point.lat],
      },
    };
  }).filter(Boolean);
}
