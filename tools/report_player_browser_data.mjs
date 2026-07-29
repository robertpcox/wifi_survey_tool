// FEATURE:      Report Player browser data fixtures
// SURFACE:      respondReportPlayerRequest(request, origin, fixture)
// WHY TOGETHER: Dashboard manifest and result responses describe one stable browser scenario.
// STATE:        One intercepted browser request
// RULES:        Browser acceptance never depends on rotating production surveys or results.
// PROVENANCE:   Report Player fixture decoupling after production survey replacement

const RESULT_PATH = "results/report-player-browser.result.v3.json";

export async function respondReportPlayerRequest(request, origin, fixture) {
  const url = request.url();
  if (url.endsWith("mazemap.min.css")) {
    await request.respond({ status: 200, contentType: "text/css", body: "" });
  } else if (url.endsWith("/favicon.ico")) {
    await request.respond({ status: 204 });
  } else if (fixture && url.endsWith(customerManifestPath(fixture))) {
    await respondJson(request, customerManifest(fixture));
  } else if (fixture && new URL(url).pathname.endsWith(`/${RESULT_PATH}`)) {
    await respondJson(request, fixture);
  } else if (url.startsWith(origin)) {
    await request.continue();
  } else {
    await request.abort("blockedbyclient");
  }
}

export function customerManifest(fixture) {
  const { meta, run } = fixture;
  return {
    schemaVersion: 3,
    customerId: run.customerId,
    customerName: meta.customerName,
    surveys: [{
      surveyId: meta.surveyId,
      surveyName: meta.surveyName,
      customerId: run.customerId,
      customerName: meta.customerName,
      campusId: meta.campusId,
      routeId: fixture.route.routeId,
      routeHash: fixture.route.hash,
      path: "data/surveys/report-player-browser.definition.v3.json",
    }],
    results: [{
      resultId: run.resultId,
      surveyId: meta.surveyId,
      customerId: run.customerId,
      campusId: meta.campusId,
      routeHash: fixture.route.hash,
      device: {
        type: run.device.type,
        os: run.device.os,
        name: run.device.name,
      },
      band: run.band,
      completionStatus: run.completionStatus,
      exportedAt: run.exportedAt,
      path: RESULT_PATH,
    }],
  };
}

function customerManifestPath(fixture) {
  const customerId = encodeURIComponent(fixture.run.customerId);
  return `/data/manifests/customers/${customerId}.manifest.v3.json`;
}

function respondJson(request, value) {
  return request.respond({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(value),
  });
}
