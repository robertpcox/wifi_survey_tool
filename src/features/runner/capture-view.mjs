import { esc } from "../../shared/format.mjs";

export function createCaptureView(documentRef, nowMs) {
  const element = id => documentRef?.getElementById(id);

  function updateLive(sample) {
    const box = element(sample.source === "cloud" ? "liveCloud" : "liveLipi");
    if (box && sample.ok) {
      const data = sample.data;
      const age = typeof data.lastSeen === "number"
        ? `${Math.round((nowMs() - data.lastSeen) / 1000)}s old`
        : "—";
      box.innerHTML = `${data.latitude.toFixed(6)}, `
        + `${data.longitude.toFixed(6)}<br>`
        + `z ${data.zLevel} · conf ${data.confidenceFactor ?? "—"}<br>`
        + `lastSeen ${age} · rtt ${sample.rttMs} ms<br>`
        + `<span style="color:#667085">`
        + `${esc(data.locationName || "")}</span>`;
    } else if (box) {
      box.innerHTML = `<span style="color:#d92d20">`
        + `${esc(sample.error || `HTTP ${sample.http}`)}</span>`;
    }
    const json = element("liveJson");
    if (json) {
      json.textContent = `── latest ${sample.source} (${sample.isoRecv}) ──\n`
        + JSON.stringify(sample.data ?? { error: sample.error }, null, 2);
    }
  }

  function renderLog(events) {
    const list = element("logList");
    if (!list) return;
    const items = [...events].reverse().slice(0, 200).map(event => {
      const time = new Date(event.tMs).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      if (event.type === "checkin") {
        return `<div class="log-item"><span class="t">${time}</span> · `
          + `<b>#${event.wpSeq + 1} ${esc(event.wpName)}</b><br>`
          + `${event.lat.toFixed(6)}, ${event.lng.toFixed(6)} · `
          + `z${event.z}</div>`;
      }
      return `<div class="log-item evt"><span class="t">${time}</span> · `
        + `<b>${event.type}</b>`
        + `${event.wpName ? ` — ${esc(event.wpName)}` : ""}`
        + `${event.note ? ` — ${esc(event.note)}` : ""}</div>`;
    });
    list.innerHTML = items.length
      ? items.join("")
      : '<div class="hint">Check-ins and events appear here.</div>';
  }

  function showPlayback(data, playback) {
    const panel = element("pbPanel");
    if (panel) panel.style.display = "flex";
    const info = element("pbInfo");
    if (info) {
      const checks = (data.events || [])
        .filter(event => event.type === "checkin").length;
      info.textContent = `${(data.samples || []).length} samples, `
        + `${checks} check-ins, `
        + `${Math.round((playback.t1 - playback.t0) / 1000)}s`;
    }
  }

  function renderPlayback(playback, lastEvent) {
    const slider = element("pbSlider");
    if (slider) {
      slider.value = Math.round(
        ((playback.t - playback.t0)
          / Math.max(1, playback.t1 - playback.t0)) * 1000,
      );
    }
    const time = element("pbTime");
    if (time) {
      time.textContent = new Date(playback.t).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    }
    const prompt = element("walkPrompt");
    if (prompt) prompt.textContent = "Playback";
    const target = element("walkTarget");
    if (target) {
      target.textContent = lastEvent
        ? `${lastEvent.type}`
          + `${lastEvent.wpName ? ` — ${lastEvent.wpName}` : ""}`
        : "…";
    }
  }

  return {
    hidePlayback: () => {
      const panel = element("pbPanel");
      if (panel) panel.style.display = "none";
    },
    playbackSpeed: () => Number(element("pbSpeed")?.value),
    renderLog,
    renderPlayback,
    setPlaybackPlaying: playing => {
      const button = element("pbPlayBtn");
      if (button) button.textContent = playing ? "❚❚ Pause" : "▶ Play";
    },
    showPlayback,
    updateLive,
  };
}
