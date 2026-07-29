// FEATURE:      V3 capture-note route-anchor validation
// SURFACE:      Distinct note IDs, embedded anchors, event linkage, and rejection cases
// WHY TOGETHER: These fields form one immutable-result join boundary.
// STATE:        Minimal route result with one note and event
// RULES:        Pseudo-checkpoint IDs, dangling anchors, duplicates, and drift all reject.
// PROVENANCE:   Runner offline field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { validateCaptureNotes } from "./capture-note-v3.mjs";

const routeHash = "a".repeat(64);

test("note and event accept one typed anchor scoped to embedded route", () => {
  assert.deepEqual(issuesFor(baseResult()), []);
});

test("duplicate note IDs and event anchor drift reject", () => {
  const duplicate = baseResult();
  duplicate.notes.push(structuredClone(duplicate.notes[0]));
  assert.match(issuesFor(duplicate).join("\n"), /notes\.1\.id: must be unique/);
  const drifted = baseResult();
  drifted.events[0].routeAnchor = {
    ...drifted.events[0].routeAnchor,
    toCheckpointId: "checkpoint-a",
  };
  assert.match(
    issuesFor(drifted).join("\n"),
    /routeAnchor: must match capture-note event/,
  );
  const timing = baseResult();
  timing.events[0].dwellSeconds = 3;
  assert.match(
    issuesFor(timing).join("\n"),
    /dwellSeconds: must match capture-note event/,
  );
  timing.notes[0].resumedAt = timing.notes[0].openedAt;
  assert.match(issuesFor(timing).join("\n"), /must equal the timestamp hold/);
});

test("pseudo-checkpoint fields and dangling route anchors reject", () => {
  const pseudo = baseResult();
  pseudo.notes[0].checkpointId = pseudo.notes[0].id;
  pseudo.events[0].checkpointId = pseudo.notes[0].id;
  const pseudoErrors = issuesFor(pseudo).join("\n");
  assert.match(pseudoErrors, /legacy pseudo-checkpoint must be omitted/);
  assert.match(pseudoErrors, /event must omit legacy checkpointId/);

  const dangling = baseResult();
  dangling.notes[0].routeAnchor = {
    ...dangling.notes[0].routeAnchor,
    fromCheckpointId: "missing-checkpoint",
    toCheckpointId: "missing-target",
    legId: "missing-leg",
  };
  dangling.events[0].routeAnchor = dangling.notes[0].routeAnchor;
  const anchorErrors = issuesFor(dangling).join("\n");
  assert.match(anchorErrors, /fromCheckpointId: must name a route checkpoint/);
  assert.match(anchorErrors, /toCheckpointId: must name a route checkpoint/);
  assert.match(anchorErrors, /legId: must name a route leg/);
});

function baseResult() {
  const routeAnchor = {
    type: "checkpoint-interval",
    routeHash,
    fromCheckpointId: "checkpoint-a",
    toCheckpointId: "checkpoint-b",
    legId: "leg-a-b",
  };
  return {
    route: {
      hash: routeHash,
      checkpoints: [
        { id: "checkpoint-a", stopId: "stop-a" },
        { id: "checkpoint-b", stopId: "stop-b" },
      ],
      legs: [{
        id: "leg-a-b", fromStopId: "stop-a", toStopId: "stop-b",
      }],
    },
    notes: [{
      id: "note-1",
      routeAnchor,
      note: "Proxy offline",
      trigger: "source-failure",
      sourceError: "HTTP 503",
      openedAt: "2026-07-29T01:00:00.000Z",
      resumedAt: "2026-07-29T01:00:02.000Z",
      dwellSeconds: 2,
      groundTruth: { lng: 170.5, lat: -45.8, z: 1 },
    }],
    events: [{
      type: "capture-note",
      noteId: "note-1",
      routeAnchor,
      at: "2026-07-29T01:00:00.000Z",
      resumedAt: "2026-07-29T01:00:02.000Z",
      dwellSeconds: 2,
    }],
  };
}

function issuesFor(result) {
  const issues = [];
  validateCaptureNotes(result, issues);
  return issues;
}
