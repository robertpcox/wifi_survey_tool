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

export function createRoomResolutionLoader({
  resolveRoomAt, resolveRoomById, concurrency = 6,
}) {
  const cache = new Map();
  let status = "idle";
  let summary = buildRoomResolutionSummary([]);
  let error = null;

  async function load(bundles, onProgress = () => {}) {
    if (typeof resolveRoomAt !== "function") {
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
      const scored = await mapWithConcurrency(observations, concurrency, async observation => {
        const result = await resolveObservation(observation);
        onProgress(done += 1, observations.length);
        return result;
      });
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

  async function resolveObservation(observation) {
    const expectedLookup = observation.expectedPoiId
      && typeof resolveRoomById === "function"
      ? await lookupId(observation.expectedPoiId, observation.target.z)
      : await lookup(observation.target);
    const candidate = expectedLookup.room;
    const expected = roomContainsPoint(candidate, observation.target)
      ? candidate : null;
    const evidenceMoments = observation.moments?.length
      ? observation.moments
      : (observation.exit === observation.entry
        ? [observation.entry] : [observation.entry, observation.exit]);
    const moments = await mapWithConcurrency(
      evidenceMoments, 2, item => observedRoom(item?.point, expected),
    );
    return scoreRoomObservation(observation, {
      expected,
      expectedError: expectedLookup.error,
      moments,
    });
  }

  async function observedRoom(point, expected) {
    if (!point || !expected?.geometry) return { room: null, error: null };
    if (Number(point.z) !== Number(expected.z)) return { room: null, error: null };
    if (roomContainsPoint(expected, point)) return { room: expected, error: null };
    const found = await lookup(point);
    if (found.error || !roomContainsPoint(found.room, point)) {
      return { room: null, error: found.error };
    }
    return found;
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
