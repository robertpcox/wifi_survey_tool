// FEATURE:      Full-screen Report Player
// SURFACE:      mountPlaybackView(root, options), renderPlaybackView(result)
// WHY TOGETHER: Player rail, transport, charts, snap tester, and selected evidence bind one clock.
// STATE:        Active mode, selected poll pair, snap controls, and latest deterministic frame
// RULES:        Inactive Player performs no frame/map writes and raw fixes remain immutable.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { playbackFrame } from "../../domain/report-playback.mjs";
import { snapFixToActiveRoute } from "../../domain/report-snap.mjs";
import { mountPlayerCharts } from "./player-charts.mjs";
import {
  playerEvidenceItems,
  renderPlayerEvidenceRail,
  updatePlayerEvidence,
} from "./player-evidence-view.mjs";
import { renderPlayerTransport, bindPlayerTransport } from "./player-transport.mjs";
import { createPlaybackController } from "./playback-controller.mjs";

export function renderPlaybackView(result) {
  return `<div class="player-module-shell">
    ${renderPlayerEvidenceRail(result)}
  </div>`;
}

export function mountPlaybackView(root, {
  result,
  transportRoot,
  onFrame = () => {},
  onInactive = () => {},
  onFollow = () => {},
  onEvidenceFocus = () => {},
}) {
  root.innerHTML = renderPlaybackView(result);
  transportRoot.innerHTML = renderPlayerTransport(
    Date.parse(result.run.stoppedAt) - Date.parse(result.run.startedAt),
  );
  transportRoot.hidden = true;
  let currentFrame;
  let selectedPollId = null;
  let snapEnabled = false;
  let radiusM = 5;
  let snap = null;
  const controller = createPlaybackController({
    result,
    active: false,
    onFrame: renderFrame,
  });
  currentFrame = controller.frame;
  const transport = bindPlayerTransport(transportRoot, controller, onFollow);
  const finalFrame = playbackFrame(result, controller.bounds.endMs);
  const charts = mountPlayerCharts(root.querySelector("[data-player-charts]"), {
    series: finalFrame.chartSeries ?? [],
    durationMs: controller.bounds.durationMs,
    onSeek: elapsedMs => controller.seek(controller.bounds.startMs + elapsedMs),
  });
  const snapToggle = root.querySelector("[data-player-snap]");
  const radius = root.querySelector("[data-player-snap-radius]");
  snapToggle.addEventListener("change", event => {
    snapEnabled = event.target.checked;
    renderFrame(currentFrame);
  });
  radius.addEventListener("input", event => {
    radiusM = Number(event.target.value);
    root.querySelector("[data-player-snap-radius-output]").textContent = `${radiusM} m`;
    if (snapEnabled) renderFrame(currentFrame);
  });
  root.addEventListener("click", event => {
    const id = event.target.closest?.("[data-player-pair]")?.dataset.playerPair;
    if (id) focusEvidence(id, "rail");
  });
  const keyHandler = event => handleKey(event, controller);
  root.ownerDocument?.addEventListener("keydown", keyHandler);

  function renderFrame(frame) {
    currentFrame = frame;
    const rawFix = normalizedFix(frame.pollEvidence?.latestRawFix ?? frame.latestFix);
    snap = snapEnabled && rawFix && frame.walker
      ? snapFixToActiveRoute(rawFix, frame.walker, radiusM)
      : null;
    transport.update(frame);
    charts.update(frame.elapsedMs);
    updatePlayerEvidence(root, frame, {
      selectedPollId,
      snap,
      floorName: z => result.meta.zLevelNames[String(z)] ?? `z ${z}`,
    });
    onFrame(frame, { snap, selectedPollId, follow: controller.follow });
  }

  function focusEvidence(id, trigger = "programmatic") {
    selectedPollId = id;
    updatePlayerEvidence(root, currentFrame, {
      selectedPollId,
      snap,
      floorName: z => result.meta.zLevelNames[String(z)] ?? `z ${z}`,
    });
    if (trigger !== "map") onEvidenceFocus(id, trigger);
    return playerEvidenceItems(currentFrame).find(item => (
      (item.pollId ?? item.poll?.id ?? item.id) === id
    )) ?? null;
  }

  function setActive(value) {
    transportRoot.hidden = !value;
    controller.setActive(value);
    if (!value) onInactive(currentFrame);
    return controller.active;
  }

  return Object.freeze({
    controller,
    destroy() {
      controller.destroy();
      root.ownerDocument?.removeEventListener("keydown", keyHandler);
    },
    focusEvidence,
    seek: controller.seek,
    setActive,
    setFollow: controller.setFollow,
    get active() { return controller.active; },
    get atMs() { return controller.atMs; },
  });
}

function normalizedFix(value) {
  return value?.fix ?? value?.normalized ?? value?.rawFix ?? value;
}

function handleKey(event, controller) {
  if (!controller.active || /INPUT|SELECT|TEXTAREA|BUTTON/.test(event.target?.tagName)) return;
  if (event.code === "Space") {
    event.preventDefault();
    if (controller.playing) controller.pause();
    else controller.play();
  } else if (event.key === "ArrowLeft") {
    controller.previousEvent();
  } else if (event.key === "ArrowRight") {
    controller.nextEvent();
  }
}
