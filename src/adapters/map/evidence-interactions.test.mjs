// FEATURE:      Player paired-evidence map interaction
// SURFACE:      Hover, tap, and keyboard-focus adapter tests
// WHY TOGETHER: Input parity and shared pair highlighting form one interaction proof.
// STATE:        Fake map handlers and feature-state calls
// RULES:        Route and IPS members emit the same provider-neutral poll identity.
// PROVENANCE:   Scope/steps/05a_recast_player.md poll-pair interaction acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createEvidenceInteractions } from "./evidence-interactions.mjs";

test("either pair member emits the same ID for hover, tap, and keyboard focus", () => {
  const handlers = new Map();
  const states = [];
  const map = {
    on(type, layer, callback) { handlers.set(`${type}:${layer}`, callback); },
    setFeatureState(target, state) { states.push([target, state]); },
  };
  const interactions = createEvidenceInteractions(map, [
    ["player-outcomes-lyr", "player-outcomes"],
    ["player-ips-pairs-lyr", "player-ips-pairs"],
  ]);
  const selections = [];
  interactions.onEvidenceSelect(selection => selections.push(selection));
  const feature = {
    id: "poll-7",
    properties: { pairId: "poll-7", pollId: "poll-7", outcome: "success" },
    geometry: { type: "Point", coordinates: [170.5, -45.8] },
  };
  handlers.get("mouseenter:player-outcomes-lyr")({ features: [feature] });
  handlers.get("click:player-ips-pairs-lyr")({
    features: [feature],
    originalEvent: { pointerType: "touch" },
  });
  interactions.focusEvidence("poll-7", "keyboard");
  assert.deepEqual(selections.map(item => [item.pairId, item.trigger]), [
    ["poll-7", "hover"],
    ["poll-7", "tap"],
    ["poll:poll-7", "keyboard"],
  ]);
  assert.deepEqual(selections[0].coordinates, [170.5, -45.8]);
  assert.ok(states.some(([target, state]) => (
    target.source === "player-outcomes"
    && target.id === "poll-7"
    && state.selected
  )));
});

test("callbacks can unsubscribe and invalid programmatic IDs are ignored", () => {
  const interactions = createEvidenceInteractions({ on() {} }, []);
  let calls = 0;
  const unsubscribe = interactions.onEvidenceSelect(() => { calls += 1; });
  unsubscribe();
  assert.equal(interactions.focusEvidence("", "keyboard"), false);
  assert.equal(interactions.focusEvidence("poll-1", "keyboard"), true);
  assert.equal(calls, 0);
});
