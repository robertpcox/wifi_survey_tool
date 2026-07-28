// FEATURE:      Report Player playback
// SURFACE:      mountPlaybackView(root, options), renderPlaybackView(result)
// WHY TOGETHER: Playback controls and evidence readout are one independent report section.
// STATE:        Bound playback controller and latest frame markup
// RULES:        Controls update the shared map frame without loading or parsing the result again.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";
import { createPlaybackController } from "./playback-controller.mjs";

export function renderPlaybackView(result) {
  const duration = Date.parse(result.run.stoppedAt) - Date.parse(result.run.startedAt);
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Playback</p><h2>Walk evidence</h2></div>
      <output data-playback-clock>00:00.0</output>
    </div>
    <div class="playback-controls">
      <button type="button" data-playback-toggle>Play</button>
      <button type="button" data-playback-reset>Reset</button>
      <label>Speed
        <select data-playback-speed>
          <option value="0.5">0.5×</option>
          <option value="1" selected>1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </label>
      <input type="range" min="0" max="${duration}" value="0"
        step="100" aria-label="Playback position" data-playback-seek>
    </div>
    <div class="playback-evidence" data-playback-evidence>
      Select play to follow polls, check-ins, and capture events.
    </div>`;
}

export function mountPlaybackView(root, { result, onFrame }) {
  root.innerHTML = renderPlaybackView(result);
  const clock = root.querySelector("[data-playback-clock]");
  const evidence = root.querySelector("[data-playback-evidence]");
  const seek = root.querySelector("[data-playback-seek]");
  const toggle = root.querySelector("[data-playback-toggle]");
  let controller;
  controller = createPlaybackController({
    result,
    onFrame: frame => {
      clock.textContent = elapsedClock(frame.elapsedMs);
      seek.value = frame.elapsedMs;
      evidence.innerHTML = evidenceMarkup(frame);
      onFrame(frame);
      if (controller) toggle.textContent = controller.playing ? "Pause" : "Play";
    },
  });
  toggle.addEventListener("click", () => {
    if (controller.playing) controller.pause();
    else controller.play();
    toggle.textContent = controller.playing ? "Pause" : "Play";
  });
  root.querySelector("[data-playback-reset]").addEventListener("click", controller.reset);
  root.querySelector("[data-playback-speed]").addEventListener(
    "change",
    event => controller.setSpeed(event.target.value),
  );
  seek.addEventListener("input", event => (
    controller.seek(controller.bounds.startMs + Number(event.target.value))
  ));
  return controller;
}

function elapsedClock(elapsedMs) {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = ((elapsedMs % 60000) / 1000).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${seconds}`;
}

function evidenceMarkup(frame) {
  const poll = frame.latestPoll;
  return `
    <dl>
      <div><dt>Latest fix</dt><dd>${esc(poll?.id ?? "Waiting")}</dd></div>
      <div><dt>HTTP</dt><dd>${esc(poll?.httpStatus ?? "—")}</dd></div>
      <div><dt>Round trip</dt><dd>${esc(poll ? `${poll.roundTripMs} ms` : "—")}</dd></div>
      <div><dt>Check-ins</dt><dd>${frame.checkIns.length}</dd></div>
      <div><dt>Capture events</dt><dd>${frame.captureEvents.length}</dd></div>
    </dl>`;
}
