// FEATURE:      Report room-resolution loading
// SURFACE:      createRoomResolutionLoader(options)
// WHY TOGETHER: Cached MazeMap lookups and bounded stationary scoring share one async lifecycle.
// STATE:        Point lookup promises, load status, and latest consolidated summary
// RULES:        Query dynamic stops and corridor marks; lookup failures never become Cisco failures.
// PROVENANCE:   Dynamic MazeMap area-resolution evidence

import { combineAreaResolutionSummaries }
  from "../../domain/report-area-summary.mjs";
import { buildDynamicCorridorObservations }
  from "../../domain/report-corridor-observation.mjs";
import { buildCorridorResolutionSummary }
  from "../../domain/report-corridor-summary.mjs";
import { roomContainsPoint } from "../../domain/report-room-geometry.mjs";
import { buildDynamicRoomObservations } from "../../domain/report-room-observation.mjs";
import { scoreRoomObservation } from "../../domain/report-room-resolution.mjs";
import { buildRoomResolutionSummary } from "../../domain/report-room-summary.mjs";
import { mapWithConcurrency } from "./bounded-map.mjs";
import {
  createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom,
} from "./room-resolution-catalog.mjs";

export function createRoomResolutionLoader({
  resolveRoomAt, resolveRoomById, resolveCampusRooms, concurrency = 6,
}) {
  const cache = new Map();
  const loadCampusRooms = createCampusRoomCatalog(resolveCampusRooms);
  let status = "idle";
  let summary = buildRoomResolutionSummary([]);
  let error = null;

  async function load(bundles, onProgress = () => {}) {
    if (typeof resolveRoomAt !== "function"
        && typeof resolveRoomById !== "function"
        && typeof resolveCampusRooms !== "function") {
      status = "unavailable";
      return summary;
    }
    status = "loading";
    error = null;
    const rooms = bundles.flatMap(bundle => buildDynamicRoomObservations(
      bundle.result, bundle.exceptions ?? [],
    ));
    const corridors = bundles.flatMap(bundle => buildDynamicCorridorObservations(
      bundle.result, bundle.exceptions ?? [],
    ));
    const observations = [...rooms, ...corridors];
    let done = 0;
    try {
      const catalogRooms = await loadCampusRooms();
      const prepared = await mapWithConcurrency(observations, concurrency, async observation => {
        const result = await resolveExpectedRoom(observation, catalogRooms);
        onProgress(done += 1, observations.length);
        return result;
      });
      const knownRooms = knownRoomIndex(prepared, catalogRooms);
      const scored = prepared.map(item => scoreObservation(item, knownRooms));
      const roomSummary = buildRoomResolutionSummary(
        scored.filter(item => item.observationKind !== "corridor-point"),
      );
      const corridorSummary = buildCorridorResolutionSummary(
        scored.filter(item => item.observationKind === "corridor-point"),
      );
      summary = combineAreaResolutionSummaries(roomSummary, corridorSummary);
      status = "ready";
    } catch (cause) {
      error = cause;
      status = "error";
    }
    return summary;
  }

  async function resolveExpectedRoom(observation, catalogRooms) {
    const catalogRoom = expectedCatalogRoom(observation, catalogRooms);
    if (catalogRoom) {
      return { observation, expected: catalogRoom, expectedError: null };
    }
    const expectedLookup = await fallbackExpectedLookup(observation);
    const candidate = expectedLookup.room;
    const expected = roomContainsPoint(candidate, observation.target)
      ? candidate : null;
    return { observation, expected, expectedError: expectedLookup.error };
  }

  function fallbackExpectedLookup(observation) {
    if (observation.expectedPoiId && typeof resolveRoomById === "function") {
      return lookupId(observation.expectedPoiId, observation.target.z);
    }
    if (typeof resolveRoomAt === "function") return lookup(observation.target);
    return Promise.resolve({ room: null, error: null });
  }

  function scoreObservation(item, knownRooms) {
    const { observation, expected, expectedError } = item;
    const evidenceMoments = observation.moments?.length
      ? observation.moments
      : (observation.exit === observation.entry
        ? [observation.entry] : [observation.entry, observation.exit]);
    const moments = evidenceMoments.map(evidence => (
      observedKnownRoom(evidence?.point, expected, knownRooms)
    ));
    return scoreRoomObservation(observation, {
      expected,
      expectedError,
      moments,
    });
  }

  function lookup(point) {
    const key = pointKey(point);
    if (!cache.has(key)) cache.set(key, Promise.resolve()
      .then(() => resolveRoomAt(point.lng, point.lat, point.z))
      .then(room => ({ room, error: null }))
      .catch(cause => ({ room: null, error: cause })));
    return cache.get(key);
  }

  function lookupId(id, z) {
    const key = `poi:${z}:${id}`;
    if (!cache.has(key)) cache.set(key, Promise.resolve()
      .then(() => resolveRoomById(id, z))
      .then(room => ({ room, error: null }))
      .catch(cause => ({ room: null, error: cause })));
    return cache.get(key);
  }

  return Object.freeze({
    load,
    setUnavailable(cause = null) {
      error = cause;
      status = "unavailable";
    },
    get error() { return error; },
    get status() { return status; },
    get summary() { return summary; },
  });
}

function pointKey(point) {
  return `${point.z}:${point.lat.toFixed(7)}:${point.lng.toFixed(7)}`;
}
