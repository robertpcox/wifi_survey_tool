// FEATURE:      Report Player shared MazeMap surface
// SURFACE:      createMapSurfaceLayout(options), routeCenter(route)
// WHY TOGETHER: Stable-layout resize, route fit, and route-derived public center share geometry timing.
// STATE:        One ResizeObserver attached to the shared map container
// RULES:        Resize then fit after two animation frames; never construct a map from this helper.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export { routeForMapAnalysis } from "./map-fit-route.mjs";

export function createMapSurfaceLayout({
  adapter,
  mapElement,
  route,
  ResizeObserverRef,
}) {
  let fittedRoute = route;
  let fitRevision = 0;
  async function settle() {
    const revision = ++fitRevision;
    await adapter?.resizeMapSoon();
    if (revision !== fitRevision) return false;
    return adapter?.fitRoute(fittedRoute) ?? false;
  }

  let observer = null;
  if (ResizeObserverRef && mapElement) {
    observer = new ResizeObserverRef(settle);
    observer.observe(mapElement.parentElement ?? mapElement);
  }
  return Object.freeze({
    disconnect: () => observer?.disconnect(),
    setRoute(next) {
      fittedRoute = next ?? route;
      fitRevision += 1;
    },
    settle,
  });
}

export function routeCenter(route) {
  const points = route.legs.flatMap(leg => leg.geometry ?? []);
  if (!points.length) return undefined;
  const lngs = points.map(point => point.lng);
  const lats = points.map(point => point.lat);
  return [
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
    (Math.min(...lats) + Math.max(...lats)) / 2,
  ];
}

export function safelyCreateMap(factory) {
  try {
    return { adapter: factory?.() ?? null, error: null };
  } catch (error) {
    return { adapter: null, error };
  }
}
