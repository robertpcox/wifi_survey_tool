// FEATURE:      Reviewed survey-result exceptions
// SURFACE:      validateReviewedExceptionsV3(sidecar, resultsById)
// WHY TOGETHER: Sidecar identity, route anchors, and reviewer fields form one validation boundary.
// STATE:        None
// RULES:        Exceptions reference immutable result evidence and never rewrite captured results.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import {
  expectArray,
  expectIso,
  expectRecord,
  expectString,
  validationResult,
} from "./validation.mjs";

const DISPOSITIONS = new Set(["include", "exclude-interval", "exclude-run"]);

export function validateReviewedExceptionsV3(sidecar, resultsById = new Map()) {
  const issues = [];
  if (sidecar?.schemaVersion !== 3) issues.push("schemaVersion: must equal 3");
  expectArray(sidecar?.exceptions, "exceptions", issues);
  const ids = new Set();
  for (const [index, exception] of (sidecar?.exceptions ?? []).entries()) {
    validateException(exception, index, resultsById, ids, issues);
  }
  return validationResult(issues);
}

function validateException(exception, index, resultsById, ids, issues) {
  const path = `exceptions.${index}`;
  expectRecord(exception, path, issues);
  for (const key of [
    "id", "resultId", "routeHash", "code", "reason", "disposition", "reviewer",
  ]) {
    expectString(exception?.[key], `${path}.${key}`, issues);
  }
  expectIso(exception?.recordedAt, `${path}.recordedAt`, issues);
  if (ids.has(exception?.id)) issues.push(`${path}.id: must be unique`);
  ids.add(exception?.id);
  if (!DISPOSITIONS.has(exception?.disposition)) {
    issues.push(`${path}.disposition: unsupported disposition`);
  }
  const result = resultsById.get(exception?.resultId);
  if (!result) {
    issues.push(`${path}.resultId: must name a deployed result`);
    return;
  }
  if (exception.routeHash !== result.run?.routeHash
    || exception.routeHash !== result.route?.hash) {
    issues.push(`${path}.routeHash: must match the result route`);
  }
  validateAnchor(exception?.routeAnchor, result, `${path}.routeAnchor`, issues);
}

function validateAnchor(anchor, result, path, issues) {
  expectRecord(anchor, path, issues);
  for (const key of [
    "type", "routeHash", "fromCheckpointId", "toCheckpointId", "legId",
  ]) {
    expectString(anchor?.[key], `${path}.${key}`, issues);
  }
  if (anchor?.type !== "checkpoint-interval") {
    issues.push(`${path}.type: must equal checkpoint-interval`);
  }
  if (anchor?.routeHash !== result.route?.hash) {
    issues.push(`${path}.routeHash: must match the embedded route`);
  }
  const checkpoints = result.route?.checkpoints ?? [];
  const from = checkpoints.find(item => item.id === anchor?.fromCheckpointId);
  const to = checkpoints.find(item => item.id === anchor?.toCheckpointId);
  if (!from) issues.push(`${path}.fromCheckpointId: must name a route checkpoint`);
  if (!to) issues.push(`${path}.toCheckpointId: must name a route checkpoint`);
  if (from && to && to.sequence !== from.sequence + 1) {
    issues.push(`${path}: checkpoints must be adjacent in authored order`);
  }
  const leg = (result.route?.legs ?? []).find(item => item.id === anchor?.legId);
  if (!leg) issues.push(`${path}.legId: must name a route leg`);
  if (leg && from && to && !anchorMatchesLeg(from, to, leg)) {
    issues.push(`${path}.legId: must match the checkpoint interval`);
  }
  const checkIns = new Map((result.checkIns ?? []).map(item => [item.checkpointId, item]));
  const fromAt = Date.parse(checkIns.get(from?.id)?.at);
  const toAt = Date.parse(checkIns.get(to?.id)?.at);
  if (!Number.isFinite(fromAt) || !Number.isFinite(toAt) || toAt <= fromAt) {
    issues.push(`${path}: checkpoints must have ordered captured check-ins`);
  }
}

function anchorMatchesLeg(from, to, leg) {
  return from.legId === leg.id
    || to.legId === leg.id
    || (from.stopId === leg.fromStopId && to.stopId === leg.toStopId)
    || (to.stopId === leg.toStopId && from.legId === leg.id);
}
