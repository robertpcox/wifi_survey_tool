export function playbackTimes(data) {
  return [
    ...(data.samples || []).map(sample =>
      sample.tRecvMs || sample.tSentMs),
    ...(data.events || []).map(event => event.tMs),
  ].filter(Boolean);
}

export function buildPlaybackFrame(data, time) {
  const samples = (data.samples || []).filter(sample =>
    (sample.tRecvMs || sample.tSentMs) <= time);
  const waypoints = (data.waypoints || []).map(waypoint => ({
    ...waypoint,
    state: "pending",
  }));
  let lastDone = -1;
  for (const event of data.events || []) {
    if (event.tMs > time) continue;
    if (event.type !== "checkin" && event.type !== "skip") continue;
    const waypoint = waypoints.find(item => item.id === event.wpId);
    if (!waypoint) continue;
    waypoint.state = event.type === "checkin" ? "done" : "skipped";
    lastDone = Math.max(lastDone, waypoint.seq);
  }
  if (lastDone + 1 < waypoints.length && lastDone >= 0) {
    waypoints[lastDone + 1].state = "current";
  } else if (
    lastDone === -1
    && waypoints.length
    && walkStarted(data.events, time)
  ) {
    waypoints[0].state = "current";
  }
  const current = waypoints.find(waypoint => waypoint.state === "current");
  const lastEvent = [...(data.events || [])]
    .filter(event => event.tMs <= time)
    .pop();
  return {
    activeLeg: current ? current.legIdx : -1,
    lastEvent,
    samples,
    waypoints,
  };
}

function walkStarted(events = [], time) {
  return events.some(event =>
    event.type === "walk_start" && event.tMs <= time);
}
