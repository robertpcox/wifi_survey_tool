// FEATURE:      Report Player evidence timeline
// SURFACE:      renderTimelineView(result), reportTimelineItems(result)
// WHY TOGETHER: Poll, check-in, and capture evidence share one chronological view.
// STATE:        None
// RULES:        Escape captured values and summarize provider evidence without raw JSON dumps.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function reportTimelineItems(result) {
  const polls = (result?.polls ?? []).map((poll, index) => ({
    at: poll.receivedAt,
    rank: 2,
    index,
    html: pollItem(poll),
  }));
  const checkIns = (result?.checkIns ?? []).map((checkIn, index) => ({
    at: checkIn.at,
    rank: 1,
    index,
    html: checkInItem(checkIn),
  }));
  const events = (result?.events ?? []).map((event, index) => ({
    at: event.at,
    rank: 0,
    index,
    html: eventItem(event),
  }));
  return [...polls, ...checkIns, ...events].sort((left, right) => (
    timestamp(left.at) - timestamp(right.at)
    || left.rank - right.rank
    || left.index - right.index
  ));
}

export function renderTimelineView(result) {
  const items = reportTimelineItems(result);
  return `
    <section class="report-timeline" aria-labelledby="timeline-title">
      <header>
        <p class="eyebrow">Raw run evidence</p>
        <h2 id="timeline-title">Timeline</h2>
        <p>${items.length} polls, check-ins, and events in chronological order.</p>
      </header>
      <ol>${items.map(item => `
        <li data-evidence-at="${esc(item.at)}">${item.html}</li>`).join("")}
      </ol>
    </section>`;
}

function pollItem(poll) {
  const fix = poll.normalized;
  const state = poll.success ? "success" : "failure";
  const error = poll.error ? `<p class="evidence-error">${esc(poll.error)}</p>` : "";
  return `
    <article class="timeline-poll">
      ${heading("Position poll", poll.id, poll.receivedAt)}
      <dl>
        ${datum("Sent", poll.sentAt)}
        ${datum("Received", poll.receivedAt)}
        ${datum("Round trip", `${poll.roundTripMs} ms`)}
        ${datum("HTTP", `${poll.httpStatus} · ${state}`)}
        ${datum("Normalized fix", fixLabel(fix))}
        ${datum("Provider capture", rawEvidence(poll.raw))}
      </dl>
      ${error}
    </article>`;
}

function checkInItem(checkIn) {
  return `
    <article class="timeline-check-in">
      ${heading("Ground-truth check-in", checkIn.checkpointId, checkIn.at)}
      <p>${esc(position(checkIn.groundTruth))}</p>
    </article>`;
}

function eventItem(event) {
  const kind = String(event.type).includes("capture") ? "Capture event" : "Run event";
  const details = scalarEntries(event, new Set(["type", "at"]));
  return `
    <article class="timeline-event">
      ${heading(kind, event.type, event.at)}
      ${details ? `<p>${esc(details)}</p>` : ""}
    </article>`;
}

function heading(kind, label, at) {
  return `
    <header>
      <p>${esc(kind)}</p>
      <h3>${esc(label)}</h3>
      <time datetime="${esc(at)}">${esc(at)}</time>
    </header>`;
}

function datum(label, value) {
  return `<div><dt>${esc(label)}</dt><dd>${esc(value ?? "Not recorded")}</dd></div>`;
}

function fixLabel(fix) {
  if (!fix) return "No normalized fix";
  const confidence = Number.isFinite(fix.confidence)
    ? ` · confidence ${fix.confidence}`
    : "";
  return `${position(fix)} · fix time ${fix.fixTime ?? "not recorded"}${confidence}`;
}

function position(value) {
  if (!value) return "No position";
  return `${value.lat}, ${value.lng} · z ${value.z}`;
}

function rawEvidence(raw) {
  if (!raw || typeof raw !== "object") return "No provider body";
  return scalarEntries(raw) || `Recorded object with ${Object.keys(raw).length} fields`;
}

function scalarEntries(value, excluded = new Set()) {
  return Object.entries(value ?? {}).filter(([key, item]) => (
    !excluded.has(key)
    && (typeof item === "string" || typeof item === "number" || typeof item === "boolean")
  )).slice(0, 6).map(([key, item]) => `${key}: ${item}`).join(" · ");
}

function timestamp(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}
