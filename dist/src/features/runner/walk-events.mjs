export function appendWalkEvent(sessionState, type, detail, nowMs) {
  const time = nowMs();
  sessionState.events.push({
    type,
    tMs: time,
    iso: new Date(time).toISOString(),
    ...detail,
  });
}

export function checkinEvent(waypoint) {
  return {
    wpId: waypoint.id,
    wpSeq: waypoint.seq,
    wpKind: waypoint.kind,
    wpName: waypoint.name,
    legIdx: waypoint.legIdx,
    lat: waypoint.lat,
    lng: waypoint.lng,
    z: waypoint.z,
  };
}

export function removeLatestWalkAction(events) {
  for (let index = events.length - 1; index >= 0; index--) {
    const type = events[index].type;
    events.splice(index, 1);
    if (type === "checkin" || type === "skip" || type === "depart") return;
  }
}
