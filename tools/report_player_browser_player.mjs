// FEATURE:      Report Player browser acceptance
// SURFACE:      exercisePlayerFollow(page), inspectPlayerLayout(page, expectedFloors)
// WHY TOGETHER: Full-screen layout and Follow camera behavior are Player-only browser assertions.
// STATE:        Active fake-SDK map, current frame clock, and responsive viewport
// RULES:        Follow off preserves frame writes but suppresses camera writes; Follow on tracks walker.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

export async function exercisePlayerFollow(page) {
  return page.evaluate(async () => {
    const failures = [];
    const moduleUrl = document.querySelector('script[type="module"]').src;
    const session = await (await import(moduleUrl)).reportPlayerReady;
    const follow = document.querySelector("[data-player-follow]");
    const mapState = window.__reportMapState;
    const writes = () => [...mapState.map.sources.values()]
      .reduce((sum, source) => sum + source.updates, 0);
    if (!follow.checked) failures.push("Follow did not default on");
    if (!mapState.cameras.length) failures.push("Follow did not initially move camera");

    const truthTimes = session.result.checkIns.map(item => Date.parse(item.at));
    if (truthTimes.length < 2) return [...failures, "Follow fixture lacks two walker moments"];
    follow.checked = false;
    follow.dispatchEvent(new Event("change", { bubbles: true }));
    const clock = () => document.querySelector("[data-player-clock]").textContent;
    const offBefore = { cameras: mapState.cameras.length, clock: clock(), writes: writes() };
    const offFrame = session.player.seek(truthTimes.at(-2));
    const offAfter = { cameras: mapState.cameras.length, clock: clock(), writes: writes() };
    if (offAfter.cameras !== offBefore.cameras) failures.push("Follow off moved camera");
    if (offAfter.writes <= offBefore.writes) failures.push("Follow off stopped frame writes");
    if (offAfter.clock === offBefore.clock) failures.push("Follow off stopped clock updates");
    if (session.player.atMs !== offFrame.atMs) failures.push("Follow off stopped clock seek");

    follow.checked = true;
    follow.dispatchEvent(new Event("change", { bubbles: true }));
    const onFrame = session.player.seek(truthTimes.at(-1));
    const camera = mapState.cameras.at(-1);
    if (mapState.cameras.length <= offAfter.cameras) failures.push("Follow on did not move camera");
    if (JSON.stringify(camera?.center) !== JSON.stringify([
      onFrame.walker.lng,
      onFrame.walker.lat,
    ])) failures.push("Follow camera did not track walker");
    if (Number(document.querySelector("[data-map-floor]").value) !== onFrame.walker.z) {
      failures.push("Follow floor did not track walker");
    }
    return failures;
  });
}

export async function inspectPlayerLayout(page, expectedFloors) {
  return page.evaluate(floors => {
    const failures = [];
    const rail = document.querySelector(".player-evidence-rail");
    const transport = document.querySelector(".player-transport").getBoundingClientRect();
    const map = document.querySelector(".maze-map").getBoundingClientRect();
    const actualFloors = [...document.querySelector("[data-map-floor]").options]
      .map(item => item.textContent.trim());
    if (JSON.stringify(actualFloors) !== JSON.stringify(floors)) failures.push("meta floors differ");
    if (document.documentElement.scrollHeight > innerHeight + 1) failures.push("Player body scrolls");
    if (transport.bottom > innerHeight || transport.left < 0) failures.push("transport unreachable");
    if (map.height < 150 || map.width < 200) failures.push("map has no remaining viewport");
    if (getComputedStyle(rail).overflowY !== "auto") failures.push("rail does not scroll independently");
    if (!document.querySelector("[data-map-access-panel]").hidden) failures.push("public map prompted");
    if (!document.querySelector("[data-map-fallback]").hidden) failures.push("fallback shown on success");
    const route = window.__reportMapState.map.sources.get("route-lines")?.data?.features ?? [];
    const coordinates = route.flatMap(feature => feature.geometry.coordinates);
    const expectedBounds = coordinates.length ? [
      [Math.min(...coordinates.map(point => point[0])), Math.min(...coordinates.map(point => point[1]))],
      [Math.max(...coordinates.map(point => point[0])), Math.max(...coordinates.map(point => point[1]))],
    ] : null;
    const fitted = window.__reportMapState.fits.at(-1)?.bounds;
    if (!expectedBounds || JSON.stringify(fitted) !== JSON.stringify(expectedBounds)) {
      failures.push("route fit does not retain exact coordinates");
    }
    const heat = window.__reportMapState.map.sources.get("report-sticky-heat")?.data?.features ?? [];
    if (heat.some(feature => (
      feature.geometry.coordinates[0] !== feature.properties.lng
      || feature.geometry.coordinates[1] !== feature.properties.lat
      || !Number.isFinite(feature.properties.weightSeconds)
    ))) failures.push("Report heat GeoJSON changed coordinates or weight");
    return { failures };
  }, expectedFloors);
}
