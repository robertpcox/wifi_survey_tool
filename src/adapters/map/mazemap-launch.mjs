// FEATURE:      Public-first MazeMap launch lifecycle
// SURFACE:      campusForLaunch(), launchCenter(), resolveLaunchContainer(), waitForMazeMapLoad()
// WHY TOGETHER: Campus fallback, live-container checks, and readiness form one launch sequence.
// STATE:        Optional caller-owned campus catalog cache
// RULES:        Public maps require an existing visible sized element and exact route coordinates.
// PROVENANCE:   Scope/steps/05a_recast_player.md public-first MazeMap contract

import { fetchCampusCatalog } from "./mazemap-catalog.mjs";
import { classifyMazeMapLaunchError } from "./mazemap-errors.mjs";

const DEFAULT_CENTER = [170.508292, -45.872428];

export async function campusForLaunch({
  cache,
  campusId,
  campusName,
  center,
  sdk,
}) {
  const key = String(campusId);
  if (cache?.has(key)) return cache.get(key);
  const fallback = {
    buildings: [],
    floors: [],
    name: cleanText(campusName),
    center: validCenter(center) ?? [...DEFAULT_CENTER],
  };
  try {
    const pending = fetchCampusCatalog(sdk, campusId, fallback.center)
      .then(catalog => ({
        ...catalog,
        name: cleanText(catalog.name) ?? fallback.name,
        center: validCenter(catalog.center) ?? fallback.center,
      }));
    cache?.set(key, pending);
    return await pending;
  } catch {
    cache?.delete(key);
    return fallback;
  }
}

export function launchCenter(runtime = {}, configuredCenter) {
  return validCenter(runtime.center)
    ?? centerOfRoute(runtime.route)
    ?? validCenter(configuredCenter)
    ?? [...DEFAULT_CENTER];
}

export function resolveLaunchContainer(container, {
  documentRef = globalThis.document,
  publicAttempt = false,
} = {}) {
  if (!publicAttempt) return container ?? "map";
  if (container == null) {
    throw new Error("Public MazeMap launch requires a supplied map container.");
  }
  const element = typeof container === "string"
    ? documentRef?.getElementById?.(container)
    : container;
  if (!element || element.isConnected === false) {
    throw new Error("Public MazeMap container must already exist.");
  }
  const rect = element.getBoundingClientRect?.();
  const width = Number(rect?.width ?? element.clientWidth);
  const height = Number(rect?.height ?? element.clientHeight);
  const style = documentRef?.defaultView?.getComputedStyle?.(element);
  const hidden = element.hidden
    || style?.display === "none"
    || style?.visibility === "hidden";
  if (hidden || !(width > 0) || !(height > 0)) {
    throw new Error("Public MazeMap container must be visible and sized.");
  }
  return element;
}

export function waitForMazeMapLoad(map, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = callback => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const timer = setTimeout(() => {
      const cause = Object.assign(Error("MazeMap load timed out"), {
        code: "MAZEMAP_TIMEOUT",
      });
      finish(() => reject(classifyMazeMapLaunchError(cause, "map-load")));
    }, timeoutMs);
    map.on("error", event => finish(() => reject(
      classifyMazeMapLaunchError(event, "map-load"),
    )));
    map.on("load", () => finish(resolve));
  });
}

export async function createLoadedMazeMap(sdk, configuration, timeoutMs) {
  let map;
  try {
    map = new sdk.Map(configuration);
  } catch (error) {
    throw classifyMazeMapLaunchError(error, "map-create");
  }
  try {
    await waitForMazeMapLoad(map, timeoutMs);
    return map;
  } catch (error) {
    map.remove?.();
    throw error;
  }
}

function centerOfRoute(route) {
  const points = [
    ...(route?.legs ?? []).flatMap(leg => leg?.geometry ?? leg?.coords ?? []),
    ...(route?.stops ?? []),
    ...(route?.checkpoints ?? []),
  ].filter(point => Number.isFinite(point?.lng) && Number.isFinite(point?.lat));
  if (!points.length) return null;
  const lngs = points.map(point => point.lng);
  const lats = points.map(point => point.lat);
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];
}

function validCenter(value) {
  const coordinates = Array.isArray(value)
    ? value
    : [value?.lng, value?.lat];
  return coordinates.length >= 2
    && Number.isFinite(Number(coordinates[0]))
    && Number.isFinite(Number(coordinates[1]))
    ? coordinates.slice(0, 2).map(Number)
    : null;
}

function cleanText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}
