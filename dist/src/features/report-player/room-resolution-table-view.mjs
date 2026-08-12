// FEATURE:      Sortable room-resolution outcomes
// SURFACE:      renderRoomResolutionTable(summary)
// WHY TOGETHER: The room outcome columns and their client-side sort values share one contract.
// STATE:        None
// RULES:        Include successful, failed, and unscored rooms; actual areas come from raw Cisco fixes.
// PROVENANCE:   Consolidated MazeMap room report

import { esc } from "../../shared/format.mjs";

const HEADERS = [
  ["number", "Room number"], ["name", "Room name"], ["level", "Level"],
  ["resolution", "Blue dot resolved in room"],
  ["closest", "Closest point / MazeMap area reached"],
  ["inside", "Count inside"], ["outside", "Count outside"],
  ["visits", "Visits"],
];

export function renderRoomResolutionTable(summary) {
  const rooms = [...(summary.rooms ?? [])].sort((left, right) => (
    roomRate(left) - roomRate(right)
      || roomNumber(left).localeCompare(roomNumber(right))
      || String(left.name ?? "").localeCompare(String(right.name ?? ""))
  ));
  return `<div class="room-resolution-table">
    <h4>Room outcomes</h4>
    <div class="report-table-scroll"><table data-room-resolution-table>
      <caption>All visited rooms, including successful and failed outcomes. Select a heading to sort.</caption>
      <thead><tr>${HEADERS.map(([key, label]) => sortHeader(key, label)).join("")}</tr></thead>
      <tbody>${rooms.map(roomRow).join("")
    || '<tr><td colspan="8">No room outcomes.</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

function sortHeader(key, label) {
  const direction = key === "resolution" ? "ascending" : "none";
  return `<th scope="col" aria-sort="${direction}"><button type="button"
    data-room-sort="${key}">${label}</button></th>`;
}

function roomRow(room) {
  const closest = closestArea(room.closestAreas ?? []);
  return `<tr data-room-number="${esc(roomNumber(room))}"
    data-room-name="${esc(room.name || "Unmapped target")}"
    data-room-level="${esc(numeric(room.z))}"
    data-room-resolution="${esc(roomRate(room))}"
    data-room-closest="${esc(closest.sortValue)}"
    data-room-inside="${esc(numeric(room.resolved))}"
    data-room-outside="${esc(numeric(room.failures))}"
    data-room-visits="${esc(numeric(room.visits))}">
    <td>${esc(roomNumber(room))}</td>
    <th scope="row">${esc(room.name || "Unmapped target")}</th>
    <td>${esc(room.floorName || level(room.z))}</td>
    <td>${outcome(room)}</td><td>${closest.html}</td>
    <td>${esc(room.resolved ?? 0)}</td><td>${esc(room.failures ?? 0)}</td>
    <td>${esc(room.visits ?? 0)}</td>
  </tr>`;
}

function outcome(room) {
  const inside = numeric(room.resolved);
  const outside = numeric(room.failures);
  const scored = inside + outside;
  if (!scored) return `<span class="room-outcome is-unscored"><strong>Unscored</strong>
    <small>${esc(room.unscored ?? room.visits ?? 0)} visit(s)</small></span>`;
  const label = inside === outside ? "Split" : (inside > outside ? "Yes" : "No");
  const kind = label === "Yes" ? "is-good" : (label === "No" ? "is-bad" : "is-mixed");
  return `<span class="room-outcome ${kind}"><strong>${label}</strong>
    <small>${roomRate(room).toFixed(1)}% · ${inside} of ${scored}</small></span>`;
}

function closestArea(areas) {
  const primary = areas[0];
  if (!primary) return { sortValue: "", html: "—" };
  const identity = [...new Set([
    primary.identifier || primary.id, primary.name,
  ].filter(Boolean))].join(" · ") || "Unknown MazeMap area";
  const other = areas.length > 1 ? ` · ${areas.length - 1} other area(s)` : "";
  const detail = `${primary.count} failed endpoint(s)${other}`;
  return {
    sortValue: identity,
    html: `<span class="room-reached-area">${esc(identity)}<small>${esc(detail)}</small></span>`,
  };
}

function roomRate(room) {
  if (Number.isFinite(room.resolutionPercent)) return room.resolutionPercent;
  const inside = numeric(room.resolved);
  const scored = inside + numeric(room.failures);
  return scored ? inside / scored * 100 : -1;
}

function roomNumber(room) {
  return String(room.identifier || room.poiId || "—");
}

function level(value) {
  return Number.isFinite(Number(value)) ? `z ${Number(value)}` : "—";
}

function numeric(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}
