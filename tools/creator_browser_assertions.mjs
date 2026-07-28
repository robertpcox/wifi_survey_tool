export async function installCreatorDownloadCapture(page) {
  await page.evaluateOnNewDocument(() => {
    URL.createObjectURL = blob => {
      window.__creatorBlob = blob;
      return "blob:creator-definition";
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function captureClick() {
      window.__creatorDownloadName = this.download;
    };
  });
}

export async function assertImmediateFirstMapCommit(page) {
  await page.waitForFunction(() => document
    .querySelector("[data-coverage-buildings]").textContent
    .includes("Clinical Services Building"));
  const status = await page.$eval("[data-creator-status]", element => ({
    kind: element.dataset.kind,
    text: element.textContent,
  }));
  if (status.kind === "error" || /lock.*plan/i.test(status.text)) {
    throw new Error(`First post-Engage map stop failed: ${status.text}`);
  }
}

export async function capturedCreatorDownload(page) {
  return page.evaluate(async () => {
    const definition = JSON.parse(await window.__creatorBlob.text());
    const rect = selectors => {
      const element = selectors.map(value => document.querySelector(value)).find(Boolean);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom, height: box.height, left: box.left,
        right: box.right, top: box.top, width: box.width,
      };
    };
    return {
      buildings: definition.meta.buildings,
      campusName: definition.meta.campusName,
      checkpoints: definition.route.checkpoints.length,
      checkpointDwells: definition.route.checkpoints.map(value => value.dwellSeconds),
      choiceSummariesSeen: window.__choiceSummariesSeen ?? 0,
      coverageText: document.querySelector("[data-coverage-buildings]").textContent,
      distanceText: document.querySelector('[data-metric="distance"]').textContent,
      dwellControls: document.querySelectorAll("[data-checkpoint-dwell]").length,
      engageActionCount: window.__initialEngageActionCount,
      engageLocked: window.__engageLocked,
      filename: window.__creatorDownloadName,
      immediateCommits: window.__immediateCommits ?? 0,
      layout: {
        map: rect(["[data-map-stage]", ".creator-map-stage", "[data-floor-map]"]),
        route: rect(["[data-route-sidebar]", ".creator-route-sidebar", ".creator-route"]),
      },
      legs: definition.route.legs.length,
      mapAccessUsed: Boolean(window.__mapAccessUsed),
      reengagePresent: document.body.textContent.includes("Re-engage"),
      routeMode: document.querySelector("[data-route-mode]").textContent,
      shortWarningHidden: document.querySelector("[data-short-warning]").hidden,
      stops: definition.route.stops.length,
      stopRecords: definition.route.stops.map(stop => ({
        lat: stop.lat, lng: stop.lng, method: stop.provenance.method,
      })),
      secretStored: JSON.stringify(definition).includes(["browser", "runtime", "map"].join("-")),
      storageEntries: localStorage.length + sessionStorage.length,
      surveyId: definition.meta.surveyId,
      totalText: document.querySelector('[data-metric="total"]').textContent,
      zLevelNames: definition.meta.zLevelNames,
      zLevels: definition.meta.zLevels,
    };
  });
}

export function creatorDownloadFindings(download) {
  const findings = [];
  if (download.stops !== 3) findings.push("expected three stops");
  if (download.legs !== 2) findings.push("expected two legs");
  if (download.checkpoints < 3) findings.push("expected generated checkpoints");
  if (download.checkpointDwells?.[0] !== 0
      || download.checkpointDwells?.at(-1) !== 0
      || download.checkpointDwells?.slice(1).some(value => !Number.isFinite(value))) {
    findings.push("expected explicit per-checkpoint dwell");
  }
  if (download.dwellControls !== Math.max(0, download.checkpoints - 2)) {
    findings.push("expected dwell controls only between route boundaries");
  }
  if (download.engageActionCount !== 1) findings.push("expected one initial Engage action");
  if (!download.engageLocked) findings.push("Engage action remained available");
  if (download.reengagePresent) findings.push("Re-engage was rendered");
  if (download.choiceSummariesSeen !== 3) findings.push("map choices were not summarized");
  if (download.immediateCommits !== 3) findings.push("map choices did not commit immediately");
  checkStopTargets(download.stopRecords, findings);
  checkDesktopLayout(download.layout, findings);
  if (download.distanceText === "0 m") findings.push("distance did not update");
  if (download.totalText === "0 s") findings.push("duration did not update");
  if (!download.routeMode.includes("MazeMap route geometry is active")) {
    findings.push("MazeMap routing was not active");
  }
  if (!download.mapAccessUsed) findings.push("Engage did not apply map access");
  if (download.campusName !== "Dunedin Hospital") findings.push("campus was not derived");
  if (download.buildings?.[0]?.name !== "Clinical Services Building") {
    findings.push("building was not derived from map points");
  }
  if (download.zLevels?.[0] !== 1 || download.zLevelNames?.[1] !== "Level 00") {
    findings.push("floor was not derived from map points");
  }
  if (!download.coverageText?.includes("Clinical Services Building")) {
    findings.push("derived coverage was not rendered");
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(download.surveyId)
      || download.filename !== `${download.surveyId}.definition.v3.json`) {
    findings.push("survey UUID or filename is invalid");
  }
  if (!download.shortWarningHidden) findings.push("short warning dismissal was lost");
  if (download.secretStored) findings.push("runtime map access reached the export");
  if (download.storageEntries) findings.push("runtime map access reached browser storage");
  return findings;
}

function checkStopTargets(stops, findings) {
  const expected = [
    { method: "map", lng: 170.5, lat: -45.87 },
    { method: "poi", lng: 170.50024, lat: -45.86998 },
    { method: "map", lng: 170.50031, lat: -45.87 },
  ];
  if (!Array.isArray(stops) || stops.length !== expected.length
      || stops.some((stop, index) => stop.method !== expected[index].method
        || Math.abs(stop.lng - expected[index].lng) > 1e-8
        || Math.abs(stop.lat - expected[index].lat) > 1e-8)) {
    findings.push("map point and POI-centre targets were not preserved");
  }
}

function checkDesktopLayout(layout, findings) {
  const route = layout?.route;
  const map = layout?.map;
  if (!route || !map) {
    findings.push("desktop route/map layout hooks are missing");
    return;
  }
  if (route.right > map.left + 1) findings.push("route sidebar is not left of map");
  if (map.width <= route.width) findings.push("map stage is not wider than route sidebar");
  if (map.height < 520) findings.push("map stage is not at least 520px tall");
}
