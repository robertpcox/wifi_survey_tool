// FEATURE:      Full-screen Report Player
// SURFACE:      renderPlayerTransport(), bindPlayerTransport(root, controller)
// WHY TOGETHER: The always-reachable playback controls share one controller binding and state refresh.
// STATE:        Current transport labels, follow preference, speed, and scrub position
// RULES:        Controls seek one clock and expose keyboard-equivalent buttons with accessible labels.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function renderPlayerTransport(durationMs) {
  return `
    <div class="player-transport" aria-label="Player transport">
      <button type="button" data-player-action="reset" aria-label="Reset playback">↺</button>
      <button type="button" data-player-action="previous" aria-label="Previous event">◀</button>
      <button type="button" class="primary player-play" data-player-action="toggle">Play</button>
      <button type="button" data-player-action="next" aria-label="Next event">▶</button>
      <label class="player-speed"><span>Speed</span>
        <select data-player-speed aria-label="Playback speed">
          <option value="0.5">0.5×</option>
          <option value="1" selected>1×</option>
          <option value="2">2×</option>
          <option value="4">4×</option>
        </select>
      </label>
      <label class="player-follow">
        <input type="checkbox" data-player-follow checked>
        <span>Follow</span>
      </label>
      <input type="range" min="0" max="${durationMs}" value="0" step="100"
        aria-label="Playback position" data-player-seek>
      <output data-player-clock>00:00.0</output>
    </div>`;
}

export function bindPlayerTransport(root, controller, onFollow = () => {}) {
  const seek = root.querySelector("[data-player-seek]");
  const toggle = root.querySelector('[data-player-action="toggle"]');
  const clock = root.querySelector("[data-player-clock]");
  root.querySelector('[data-player-action="reset"]').addEventListener(
    "click",
    controller.reset,
  );
  root.querySelector('[data-player-action="previous"]').addEventListener(
    "click",
    controller.previousEvent,
  );
  root.querySelector('[data-player-action="next"]').addEventListener(
    "click",
    controller.nextEvent,
  );
  toggle.addEventListener("click", () => {
    if (controller.playing) controller.pause();
    else controller.play();
    updateToggle(toggle, controller.playing);
  });
  root.querySelector("[data-player-speed]").addEventListener(
    "change",
    event => controller.setSpeed(event.target.value),
  );
  root.querySelector("[data-player-follow]").addEventListener("change", event => {
    controller.setFollow(event.target.checked);
    onFollow(event.target.checked);
  });
  seek.addEventListener("input", event => (
    controller.seek(controller.bounds.startMs + Number(event.target.value))
  ));
  return Object.freeze({
    update(frame) {
      seek.value = frame.elapsedMs;
      clock.textContent = elapsedClock(frame.elapsedMs);
      updateToggle(toggle, controller.playing);
    },
  });
}

function updateToggle(toggle, playing) {
  toggle.textContent = playing ? "Pause" : "Play";
  toggle.setAttribute("aria-pressed", String(playing));
}

function elapsedClock(elapsedMs) {
  const minutes = Math.floor(elapsedMs / 60000);
  const seconds = ((elapsedMs % 60000) / 1000).toFixed(1).padStart(4, "0");
  return `${String(minutes).padStart(2, "0")}:${seconds}`;
}
