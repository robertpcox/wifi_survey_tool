// FEATURE:      Full-screen Report Player
// SURFACE:      renderPlayerEvidenceRail(result), updatePlayerEvidence(root, frame, options)
// WHY TOGETHER: Moment evidence, poll-pair selection, snap status, and raw provider disclosure form one rail.
// STATE:        Selected poll evidence is reflected by the caller
// RULES:        Label route positions as estimates and keep returned raw evidence visibly unchanged.
// PROVENANCE:   Scope/steps/05a_recast_player.md and Scope/contracts/report_analysis.md

import {
  captureMarkup,
  pairMarkup,
  pairPickerMarkup,
  playerEvidenceItems,
  rawEvidence,
  requestState,
  snapLabel,
  stateLabel,
} from "./player-evidence-detail.mjs";

export { playerEvidenceItems } from "./player-evidence-detail.mjs";

export function renderPlayerEvidenceRail(result) {
  const firstFloor = result.meta.zLevelNames[String(result.meta.zLevels[0])];
  return `
    <aside class="player-evidence-rail" aria-label="Evidence at selected moment">
      <header class="player-rail-heading">
        <div><p class="section-kicker">Selected moment</p><h2>What happened</h2></div>
        <span class="player-chip" data-player-state>Waiting</span>
      </header>
      <section class="player-moment-grid" aria-live="polite">
        ${metric("Distance", "—", "distance")}
        ${metric("Route floor", firstFloor, "route-floor")}
        ${metric("Reported floor", "—", "reported-floor")}
        ${metric("Fix age", "—", "fix-age")}
        ${metric("Request", "—", "request")}
        ${metric("Round trip", "—", "rtt")}
      </section>
      <section class="player-rail-section">
        <h3>Poll and position pair</h3>
        <div class="player-pair-picker" data-player-pairs>
          <span class="empty-state">No completed capture polls yet.</span>
        </div>
        <div class="player-pair-detail" data-player-pair-detail>
          Scrub or play to inspect request and returned IPS evidence.
        </div>
      </section>
      <section class="player-rail-section player-snap-controls">
        <div>
          <h3>Snap-to-path tester</h3>
          <p>Visualization only. The raw blue fix is never changed or exported.</p>
        </div>
        <label><input type="checkbox" data-player-snap> Show candidate</label>
        <label>Acceptance radius
          <input type="range" min="1" max="20" value="5" step="1" data-player-snap-radius>
          <output data-player-snap-radius-output>5 m</output>
        </label>
        <p data-player-snap-status>Snap tester off.</p>
      </section>
      <section class="player-rail-section">
        <h3>Error and fix age</h3>
        <div class="player-charts" data-player-charts></div>
      </section>
      <section class="player-rail-section">
        <h3>Capture state</h3>
        <div data-player-capture>No check-in or capture event at this moment.</div>
      </section>
      <details class="player-rail-section player-raw-evidence">
        <summary>Raw provider evidence</summary>
        <pre data-player-raw>No usable capture fix yet.</pre>
      </details>
    </aside>`;
}

export function updatePlayerEvidence(root, frame, {
  selectedPollId = null,
  snap = null,
  floorName = z => String(z ?? "—"),
} = {}) {
  const evidence = frame.pollEvidence ?? {};
  const latest = evidence.latestRawFix ?? frame.latestRawFix ?? frame.latestFix ?? null;
  const selected = selectedEvidence(frame, selectedPollId)
    ?? selectedEvidence(frame, frame.latestPoll?.id);
  const poll = selected?.poll ?? selected ?? frame.latestPoll ?? latest?.poll;
  const context = selected ?? latest ?? poll;
  const truth = context?.receivedTruth ?? context?.routeReceive ?? frame.walker;
  const fix = poll?.normalized ?? context?.rawFix ?? latest?.fix ?? latest?.normalized ?? latest;
  const distance = finite(context?.distanceM ?? context?.distanceAtReceiptM);
  const fixAge = finite(context?.fixAgeSeconds ?? frame.latestFixAgeSeconds);
  const floorMatch = context?.floorMatch ?? (
    Number.isFinite(fix?.z) && Number.isFinite(truth?.z) ? fix.z === truth.z : null
  );
  setMetric(root, "distance", distance == null ? "—" : `${distance.toFixed(1)} m`);
  setMetric(root, "route-floor", truth ? floorName(truth.z) : "Unlocated");
  setMetric(root, "reported-floor", fix ? floorName(fix.z) : "—");
  setMetric(root, "fix-age", fixAge == null ? "—" : `${fixAge.toFixed(1)} s`);
  setMetric(root, "request", requestState(frame, poll));
  const rtt = finite(context?.roundTripMs ?? poll?.roundTripMs);
  setMetric(root, "rtt", rtt == null ? "—" : `${rtt} ms`);
  root.querySelector("[data-player-state]").textContent = stateLabel({
    fix,
    fixAge,
    floorMatch,
    poll,
  });
  root.querySelector("[data-player-pairs]").innerHTML = pairPickerMarkup(
    frame,
    selectedPollId,
  );
  root.querySelector("[data-player-pair-detail]").innerHTML = pairMarkup(selected ?? context);
  root.querySelector("[data-player-capture]").innerHTML = captureMarkup(frame);
  root.querySelector("[data-player-raw]").textContent = rawEvidence(poll, latest);
  root.querySelector("[data-player-snap-status]").textContent = snapLabel(snap);
}

function metric(label, value, key) {
  return `<div><span>${label}</span><strong data-player-metric="${key}">${value}</strong></div>`;
}

function setMetric(root, key, value) {
  const target = root.querySelector(`[data-player-metric="${key}"]`);
  if (target) target.textContent = value;
}

function selectedEvidence(frame, selectedPollId) {
  if (!selectedPollId) return null;
  return playerEvidenceItems(frame).find(item => (
    (item.pollId ?? item.poll?.id ?? item.id) === selectedPollId
  )) ?? frame.polls?.find(poll => poll.id === selectedPollId) ?? null;
}

function finite(value) {
  return Number.isFinite(value) ? value : null;
}
