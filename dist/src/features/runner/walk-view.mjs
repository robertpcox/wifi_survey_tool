import { haversine } from "../../domain/geometry.mjs";
import { tagOf } from "../../domain/stop-targets.mjs";

export function createWalkView(options) {
  const { documentRef, routeState, sessionState, mapAdapter, nowMs } = options;
  const element = id => documentRef?.getElementById(id);
  const setText = (id, text) => {
    const node = element(id);
    if (node) node.textContent = text;
  };

  function updateCard(playbackActive = false) {
    if (!playbackActive) updateActiveLeg();
    const button = element("walkBtn");
    const prompt = element("walkPrompt");
    const target = element("walkTarget");
    const secondary = element("walkSecondary");
    if (!button || !prompt || !target || !secondary) return;
    button.className = "btn-big";
    button.disabled = false;
    if (playbackActive) {
      prompt.textContent = "Playback mode";
      target.textContent = "—";
      button.disabled = true;
      secondary.style.display = "none";
      return;
    }
    const walk = sessionState.walk;
    if (walk.phase === "idle" || walk.phase === "done") {
      prompt.textContent = walk.phase === "done"
        ? "Walk complete"
        : (routeState.waypoints.length ? "Route ready" : "Route not built yet");
      target.textContent = routeState.waypoints.length
        ? `${routeState.waypoints.length} check-in points`
        : "—";
      button.textContent = walk.phase === "done"
        ? "↻ Restart walk"
        : "▶ Start walk";
      button.disabled = !routeState.waypoints.length;
      secondary.style.display = "none";
      return;
    }
    renderActiveWalk(button, prompt, target, secondary);
  }

  function renderActiveWalk(button, prompt, target, secondary) {
    const walk = sessionState.walk;
    const waypoint = routeState.waypoints[walk.wpIdx];
    secondary.style.display = "flex";
    if (walk.phase === "awaitDepart") {
      prompt.textContent = "Arrived — idle here, then depart";
      target.textContent = waypoint?.name ?? "—";
      const stopTag = waypoint?.stopIdx != null
        ? tagOf(routeState.stops, waypoint.stopIdx)
        : "";
      button.textContent = `▶ Depart ${stopTag}`;
      button.classList.add("depart");
      return;
    }
    const leg = routeState.legs[waypoint?.legIdx];
    const legName = leg
      ? `${tagOf(routeState.stops, leg.fromIdx)}→`
        + tagOf(routeState.stops, leg.toIdx)
      : "";
    prompt.textContent = `Point ${walk.wpIdx + 1} of `
      + `${routeState.waypoints.length}`
      + (waypoint ? ` · leg ${legName} · level ${waypoint.z}` : "");
    target.textContent = waypoint?.name ?? "—";
    const isStop = waypoint?.kind === "stop" && waypoint.seq > 0;
    button.textContent = isStop ? "🏁 Arrived — check in" : "✓ I'm here";
    if (isStop) button.classList.add("arrive");
  }

  function updateDistance(playbackActive = false) {
    const distance = element("walkDist");
    if (!distance) return;
    const walk = sessionState.walk;
    if (playbackActive || walk.phase !== "walking" || walk.wpIdx < 0) {
      distance.textContent = "";
      return;
    }
    const waypoint = routeState.waypoints[walk.wpIdx];
    const latest = [...sessionState.samples].reverse().find(sample =>
      sample.ok && sample.data
      && typeof sample.data.latitude === "number");
    if (!waypoint || !latest) {
      distance.textContent = "";
      return;
    }
    const metres = haversine({
      lng: latest.data.longitude,
      lat: latest.data.latitude,
    }, waypoint);
    const age = Math.round((nowMs() - latest.tRecvMs) / 1000);
    distance.textContent = `≈ ${metres.toFixed(1)} m from target `
      + `(${latest.source}, ${age}s ago)`;
  }

  function updateActiveLeg() {
    const walk = sessionState.walk;
    const walking = walk.phase === "walking" || walk.phase === "awaitDepart";
    const legIndex = walking
      ? (routeState.waypoints[walk.wpIdx]?.legIdx ?? -1)
      : -1;
    mapAdapter.setActiveLeg?.(legIndex);
  }

  return {
    resetCounts: () => {
      setText("cntCloud", "0");
      setText("cntLipi", "0");
      setText("cntCheckin", "0");
    },
    setCheckinCount: count => setText("cntCheckin", count),
    setSourceCount: (source, count) =>
      setText(source === "cloud" ? "cntCloud" : "cntLipi", count),
    setSourceState: (source, state) => {
      const dot = element(source === "cloud" ? "dotCloud" : "dotLipi");
      if (dot) dot.className = state ? `dot ${state}` : "dot";
    },
    updateCard,
    updateDistance,
  };
}
