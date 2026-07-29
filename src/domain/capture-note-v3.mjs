// FEATURE:      V3 capture-note route-anchor contract
// SURFACE:      validateCaptureNotes(result, issues)
// WHY TOGETHER: Note fields, held ground truth, and event linkage form one result invariant.
// STATE:        None
// RULES:        Note IDs are distinct; typed anchors name immutable authored route targets.
// PROVENANCE:   Runner offline field feedback

import {
  expectArray,
  expectIso,
  expectNumber,
  expectRecord,
  expectString,
} from "./validation.mjs";

export function validateCaptureNotes(result, issues) {
  if (result?.notes === undefined) return;
  expectArray(result.notes, "notes", issues);
  const ids = new Set();
  for (const [index, note] of (result.notes ?? []).entries()) {
    const path = `notes.${index}`;
    for (const key of ["id", "note", "trigger"]) {
      expectString(note?.[key], `${path}.${key}`, issues);
    }
    expectIso(note?.openedAt, `${path}.openedAt`, issues);
    expectIso(note?.resumedAt, `${path}.resumedAt`, issues);
    expectNumber(note?.dwellSeconds, `${path}.dwellSeconds`, issues, 0);
    const elapsedSeconds = (
      Date.parse(note?.resumedAt) - Date.parse(note?.openedAt)
    ) / 1000;
    if (Number.isFinite(elapsedSeconds)
      && elapsedSeconds !== note?.dwellSeconds) {
      issues.push(`${path}.dwellSeconds: must equal the timestamp hold`);
    }
    expectRecord(note?.groundTruth, `${path}.groundTruth`, issues);
    for (const key of ["lng", "lat", "z"]) {
      expectNumber(note?.groundTruth?.[key], `${path}.groundTruth.${key}`, issues);
    }
    validateRouteAnchor(result, note, path, issues);
    if (ids.has(note?.id)) issues.push(`${path}.id: must be unique`);
    ids.add(note?.id);
    if (!["manual", "source-failure"].includes(note?.trigger)) {
      issues.push(`${path}.trigger: unsupported trigger`);
    }
    if (note?.sourceError !== null && typeof note?.sourceError !== "string") {
      issues.push(`${path}.sourceError: must be a string or null`);
    }
    validateEventLink(result.events, note, path, issues);
  }
}

function validateRouteAnchor(result, note, path, issues) {
  const anchor = note?.routeAnchor;
  const anchorPath = `${path}.routeAnchor`;
  expectRecord(anchor, anchorPath, issues);
  for (const key of ["type", "routeHash", "toCheckpointId"]) {
    expectString(anchor?.[key], `${anchorPath}.${key}`, issues);
  }
  nullableString(anchor?.fromCheckpointId,
    `${anchorPath}.fromCheckpointId`, issues);
  nullableString(anchor?.legId, `${anchorPath}.legId`, issues);
  if (anchor?.type !== "checkpoint-interval") {
    issues.push(`${anchorPath}.type: must equal checkpoint-interval`);
  }
  if (anchor?.routeHash !== result?.route?.hash) {
    issues.push(`${anchorPath}.routeHash: must match the embedded route`);
  }
  if (Object.hasOwn(note ?? {}, "checkpointId")) {
    issues.push(`${path}.checkpointId: legacy pseudo-checkpoint must be omitted`);
  }
  const checkpoints = Array.isArray(result?.route?.checkpoints)
    ? result.route.checkpoints
    : [];
  const fromIndex = anchor?.fromCheckpointId === null
    ? -1
    : checkpoints.findIndex(item => item.id === anchor?.fromCheckpointId);
  const toIndex = checkpoints.findIndex(
    item => item.id === anchor?.toCheckpointId,
  );
  if (anchor?.fromCheckpointId !== null && fromIndex < 0) {
    issues.push(`${anchorPath}.fromCheckpointId: must name a route checkpoint`);
  }
  if (toIndex < 0) {
    issues.push(`${anchorPath}.toCheckpointId: must name a route checkpoint`);
  }
  if (fromIndex >= 0 && toIndex >= 0
    && toIndex !== fromIndex && toIndex !== fromIndex + 1) {
    issues.push(`${anchorPath}: checkpoints must describe the active interval`);
  }
  const from = checkpoints[fromIndex];
  const to = checkpoints[toIndex];
  const expectedLeg = anchorLegId(result?.route?.legs, from, to);
  const legExists = (result?.route?.legs ?? []).some(
    leg => leg.id === anchor?.legId,
  );
  if (anchor?.legId !== null && !legExists) {
    issues.push(`${anchorPath}.legId: must name a route leg`);
  }
  if (anchor?.legId !== expectedLeg) {
    issues.push(`${anchorPath}.legId: must match the active route interval`);
  }
  if ([anchor?.fromCheckpointId, anchor?.toCheckpointId]
    .includes(note?.id)) {
    issues.push(`${path}.id: must be distinct from authored checkpoint IDs`);
  }
}

function validateEventLink(events, note, path, issues) {
  const matches = (Array.isArray(events) ? events : []).filter(event => (
    event?.type === "capture-note" && event?.noteId === note?.id
  ));
  if (matches.length !== 1) {
    issues.push(`${path}.id: must have exactly one capture-note event`);
    return;
  }
  const event = matches[0];
  if (!sameAnchor(event.routeAnchor, note.routeAnchor)) {
    issues.push(`${path}.routeAnchor: must match capture-note event`);
  }
  if (Object.hasOwn(event, "checkpointId")) {
    issues.push(`${path}: capture-note event must omit legacy checkpointId`);
  }
  if (event.at !== note.openedAt || event.resumedAt !== note.resumedAt) {
    issues.push(`${path}: timestamps must match capture-note event`);
  }
  if (event.dwellSeconds !== note.dwellSeconds) {
    issues.push(`${path}.dwellSeconds: must match capture-note event`);
  }
}

function nullableString(value, path, issues) {
  if (value !== null) expectString(value, path, issues);
}

function anchorLegId(legs, from, to) {
  if (!from || !to || from.id === to.id) return null;
  const values = Array.isArray(legs) ? legs : [];
  for (const id of [to.legId, from.legId]) {
    if (id && values.some(leg => leg.id === id)) return id;
  }
  return values.find(leg => (
    leg.fromStopId === from.stopId && leg.toStopId === to.stopId
  ))?.id ?? null;
}

function sameAnchor(left, right) {
  return ["type", "routeHash", "fromCheckpointId", "toCheckpointId", "legId"]
    .every(key => left?.[key] === right?.[key]);
}
