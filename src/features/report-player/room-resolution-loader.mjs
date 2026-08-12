// FEATURE:      Report room-resolution loading
// SURFACE:      createRoomResolutionLoader(options)
// WHY TOGETHER: Bulk room loading and stationary scoring share one async lifecycle.
// STATE:        Bulk room-catalogue status and latest consolidated summary
// RULES:        Match every truth and Cisco point locally; never query a closest POI per point.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import { combineAreaResolutionSummaries }
  from "../../domain/report-area-summary.mjs";
import { buildCorridorObservations }
  from "../../domain/report-corridor-observation.mjs";
import { buildCorridorResolutionSummary }
  from "../../domain/report-corridor-summary.mjs";
import { buildRoomObservations } from "../../domain/report-room-observation.mjs";
import { scoreRoomObservation } from "../../domain/report-room-resolution.mjs";
import { buildRoomResolutionSummary } from "../../domain/report-room-summary.mjs";
import {
  createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom,
} from "./room-resolution-catalog.mjs";

export function createRoomResolutionLoader({ resolveCampusRooms } = {}) {
  const loadCampusRooms = createCampusRoomCatalog(resolveCampusRooms);
  let status = "idle";
  let summaries = Object.freeze({
    room: emptyAreaSummary(),
    zone: emptyAreaSummary(),
  });
  let error = null;

  async function load(bundles, onProgress = () => {}) {
    if (typeof resolveCampusRooms !== "function") {
      status = "unavailable";
      return summaries.room;
    }
    status = "loading";
    error = null;
    const rooms = bundles.flatMap(bundle => buildRoomObservations(
      bundle.result, bundle.exceptions ?? [],
    ));
    const corridors = bundles.flatMap(bundle => buildCorridorObservations(
      bundle.result, bundle.exceptions ?? [],
    ));
    const observations = [...rooms, ...corridors];
    let done = 0;
    try {
      const catalogRooms = await loadCampusRooms(observations);
      const total = observations.length * 2;
      summaries = Object.freeze(Object.fromEntries(["room", "zone"].map(areaKind => {
        const prepared = observations.map(observation => {
          const result = resolveExpectedRoom(observation, catalogRooms, areaKind);
          onProgress(done += 1, total);
          return result;
        });
        return [areaKind, scoreAreaKind(prepared, catalogRooms, areaKind)];
      })));
      status = "ready";
    } catch (cause) {
      error = cause;
      status = "error";
    }
    return summaries.room;
  }

  function resolveExpectedRoom(observation, catalogRooms, areaKind) {
    return {
      observation,
      expected: expectedCatalogRoom(observation, catalogRooms, areaKind),
      expectedError: null,
    };
  }

  function scoreAreaKind(prepared, catalogRooms, areaKind) {
    const eligible = areaKind === "zone"
      ? prepared.filter(item => item.expected)
      : prepared;
    const knownRooms = knownRoomIndex(eligible, catalogRooms, areaKind);
    const scored = eligible.map(item => scoreObservation(item, knownRooms, areaKind));
    const room = buildRoomResolutionSummary(
      scored.filter(item => item.observationKind !== "corridor-point"),
    );
    const corridor = buildCorridorResolutionSummary(
      scored.filter(item => item.observationKind === "corridor-point"),
    );
    return combineAreaResolutionSummaries(room, corridor);
  }

  function scoreObservation(item, knownRooms, areaKind) {
    const { observation, expected, expectedError } = item;
    const evidenceMoments = observation.moments?.length
      ? observation.moments
      : (observation.exit === observation.entry
        ? [observation.entry] : [observation.entry, observation.exit]);
    const moments = evidenceMoments.map(evidence => (
      observedKnownRoom(evidence?.point, expected, knownRooms, areaKind)
    ));
    return scoreRoomObservation(observation, {
      expected,
      expectedError,
      moments,
    });
  }

  return Object.freeze({
    load,
    setUnavailable(cause = null) {
      error = cause;
      status = "unavailable";
    },
    get error() { return error; },
    get status() { return status; },
    get summary() { return summaries.room; },
    get summaries() { return summaries; },
    get roomSummary() { return summaries.room; },
    get zoneSummary() { return summaries.zone; },
    summaryFor(areaKind) { return summaries[areaKind] ?? summaries.room; },
  });
}

function emptyAreaSummary() {
  return combineAreaResolutionSummaries(
    buildRoomResolutionSummary([]), buildCorridorResolutionSummary([]),
  );
}
