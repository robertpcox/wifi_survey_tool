// FEATURE:      Runner browser response fixtures
// SURFACE:      respondRunnerBrowserRequest(request, origin, definition)
// WHY TOGETHER: Smoke-only manifest, position, and definition responses share one boundary.
// STATE:        One intercepted browser request
// RULES:        Fixture selection is independent from the rotating production survey manifest.
// PROVENANCE:   Runner fixture decoupling after production survey replacement

export const RUNNER_BROWSER_POSITION = Object.freeze({
  lat: -45.87248,
  lng: 170.50853,
  z: 1,
});

export async function respondRunnerBrowserRequest(request, origin, definition) {
  const url = request.url();
  if (url.endsWith("mazemap.min.css")) {
    await request.respond({ status: 200, contentType: "text/css", body: "" });
    return;
  }
  if (url.endsWith("/data/manifests/survey-manifest.v3.json")) {
    await respondJson(request, {
      schemaVersion: 3,
      surveys: [{
        surveyId: definition.meta.surveyId,
        path: "data/surveys/runner-browser.definition.v3.json",
      }],
    });
    return;
  }
  if (url.includes("/mm-positioning-proxy/position?")) {
    await respondJson(request, {
      latitude: RUNNER_BROWSER_POSITION.lat,
      longitude: RUNNER_BROWSER_POSITION.lng,
      zLevel: RUNNER_BROWSER_POSITION.z,
      lastSeen: new Date().toISOString(),
      confidenceFactor: 0.93,
      recordedBrowserFixture: true,
    });
    return;
  }
  if (url.endsWith(".definition.v3.json")) {
    const fast = structuredClone(definition);
    fast.meta.sourceConfig.pollIntervalMs = 50;
    fast.meta.route.checkpointDwellSeconds = 0;
    await respondJson(request, fast);
    return;
  }
  if (url.startsWith(origin)) await request.continue();
  else await request.abort("blockedbyclient");
}

function respondJson(request, value) {
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(value),
  });
}
