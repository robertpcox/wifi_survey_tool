// FEATURE:      Report Player shared MazeMap surface
// SURFACE:      createMapSurfaceLayout(options), routeCenter(route)
// WHY TOGETHER: Stable-layout resize, route fit, and route-derived public center share geometry timing.
// STATE:        One ResizeObserver attached to the shared map container
// RULES:        Resize then fit after two animation frames; never construct a map from this helper.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function createMapSurfaceLayout({
  adapter,
  mapElement,
  route,
  ResizeObserverRef,
}) {
  async function settle() {
    await adapter?.resizeMapSoon();
    adapter?.fitRoute(route);
  }

  let observer = null;
  if (ResizeObserverRef && mapElement) {
    observer = new ResizeObserverRef(settle);
    observer.observe(mapElement.parentElement ?? mapElement);
  }
  return Object.freeze({
    disconnect: () => observer?.disconnect(),
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
