// FEATURE:      Sortable zone-match outcomes
// SURFACE:      renderZoneResolutionTable(summary)
// WHY TOGETHER: Zone aggregation and sortable outcome columns share one display contract.
// STATE:        None
// RULES:        Merge dwell and walking evidence by zone; enclosing rooms never appear.
// PROVENANCE:   Zone-only local containment summary

import { esc } from "../../shared/format.mjs";

export function renderZoneResolutionTable(summary) {
  const groups = zoneGroups(summary);
  return `<div class="room-resolution-table"><h4>Zone outcomes</h4>
    <div class="report-table-scroll"><table data-room-resolution-table data-area-kind="zone">
      <caption>All tested zones, including successful and failed outcomes. Select a heading to sort.</caption>
      <thead><tr>${header("number", "Zone number / ID")}${header("name", "Zone name")}
        ${header("level", "Level")}${header("resolution", "Blue dot resolved in zone")}
        ${header("inside", "Count inside")}${header("outside", "Count outside")}
        <th>Unscored</th>${header("visits", "Observations")}<th>Worst outside</th>
      </tr></thead><tbody>${groups.map(zoneRow).join("")}</tbody>
    </table></div></div>`;
}

export function zoneGroupCount(summary) {
  return zoneGroups(summary).length;
}

function header(key, label) {
  return `<th scope="col" aria-sort="${key === "resolution" ? "ascending" : "none"}">
    <button type="button" data-room-sort="${key}">${label}</button></th>`;
}

function zoneRow(zone) {
  const rate = percent(zone.inside, zone.inside + zone.outside);
  return `<tr data-room-number="${esc(zone.identifier || zone.poiId || "—")}"
    data-room-name="${esc(zone.name || "Unnamed zone")}" data-room-level="${esc(number(zone.z))}"
    data-room-resolution="${esc(rate ?? -1)}" data-room-inside="${esc(zone.inside)}"
    data-room-outside="${esc(zone.outside)}" data-room-visits="${esc(zone.observations)}">
    <td>${esc(zone.identifier || zone.poiId || "—")}</td>
    <th scope="row">${esc(zone.name || "Unnamed zone")}</th>
    <td>${esc(zone.floorName || level(zone.z))}</td><td>${outcome(zone, rate)}</td>
    <td>${esc(zone.inside)}</td><td>${esc(zone.outside)}</td><td>${esc(zone.unscored)}</td>
    <td>${esc(zone.observations)}</td><td>${esc(distance(zone.maxOutsideDistanceM))}</td>
  </tr>`;
}

function outcome(zone, rate) {
  const scored = zone.inside + zone.outside;
  if (!scored) return '<span class="room-outcome is-unscored"><strong>Unscored</strong></span>';
  const label = zone.inside === zone.outside ? "Split" : (zone.inside > zone.outside ? "Yes" : "No");
  const kind = label === "Yes" ? "is-good" : (label === "No" ? "is-bad" : "is-mixed");
  return `<span class="room-outcome ${kind}"><strong>${label}</strong>
    <small>${rate.toFixed(1)}% · ${zone.inside} of ${scored}</small></span>`;
}

function zoneGroups(summary = {}) {
  const groups = new Map();
  for (const room of summary.rooms ?? []) mergeGroup(groups, room, {
    visits: room.visits, inside: room.resolved, outside: room.failures, unscored: room.unscored,
  });
  for (const zone of summary.corridor?.corridors ?? []) mergeGroup(groups, zone, {
    visits: zone.samples, inside: zone.resolved, outside: zone.failures, unscored: zone.unscored,
  });
  return [...groups.values()].sort((left, right) => rate(left) - rate(right)
    || String(left.identifier ?? left.poiId).localeCompare(String(right.identifier ?? right.poiId)));
}

function mergeGroup(groups, value, counts) {
  const key = value.poiId ? `poi:${value.poiId}` : `${value.z}:${value.identifier}:${value.name}`;
  const group = groups.get(key) ?? { ...value, inside: 0, outside: 0, unscored: 0, observations: 0 };
  group.inside += number(counts.inside); group.outside += number(counts.outside);
  group.unscored += number(counts.unscored); group.observations += number(counts.visits);
  if (Number.isFinite(value.maxOutsideDistanceM)) {
    group.maxOutsideDistanceM = Math.max(
      group.maxOutsideDistanceM ?? 0, value.maxOutsideDistanceM,
    );
  }
  groups.set(key, group);
}

function rate(value) { return percent(value.inside, value.inside + value.outside) ?? -1; }
function percent(part, whole) { return whole ? part / whole * 100 : null; }
function distance(value) { return Number.isFinite(value) ? `${value.toFixed(1)} m` : "—"; }
function level(value) { return Number.isFinite(Number(value)) ? `z ${Number(value)}` : "—"; }
function number(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }
