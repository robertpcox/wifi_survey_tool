export async function prepareSurveyPage(page, origin, errors, requests) {
  await page.evaluateOnNewDocument(installDownloadCapture);
  await page.setRequestInterception(true);
  page.on("request", request => {
    requests.push(request.url());
    respondToRequest(request, origin).catch(error => {
      errors.push(`request stub: ${error.message}`);
    });
  });
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", error => errors.push(error.message));
}

function installDownloadCapture() {
  for (const key of ["appId", "appKey", "mapAccess"]) {
    localStorage.setItem(`routeSurvey.v1.${key}`, `planted-${key}`);
  }
  window.__downloads = [];
  let latestBlob = null;
  URL.createObjectURL = blob => {
    latestBlob = blob;
    return "blob:route-survey-test";
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function click() {
    const record = { filename: this.download, type: latestBlob?.type };
    window.__downloads.push(record);
    latestBlob?.text().then(content => {
      record.content = content;
    });
  };
}

async function respondToRequest(request, origin) {
  const url = request.url();
  if (url.endsWith("mazemap.min.js")) {
    await request.respond({
      status: 200,
      contentType: "text/javascript",
      body: mazemapStub,
    });
  } else if (url.endsWith("mazemap.min.css")) {
    await request.respond({ status: 200, contentType: "text/css", body: "" });
  } else if (url.endsWith("/favicon.ico")) {
    await request.respond({ status: 204 });
  } else if (url.includes("mm-positioning-proxy/position")) {
    await request.respond({
      status: 200,
      contentType: "application/json",
      body: '{"latitude":-45.87245,"longitude":170.5085,'
        + '"zLevel":1,"confidenceFactor":0.9,"lastSeen":0,'
        + '"locationName":"Stubbed browser fix"}',
    });
  } else if (url.startsWith(origin)) {
    await request.continue();
  } else {
    await request.abort("blockedbyclient");
  }
}

const mazemapStub = `
class Source { setData(data) { this.data = data; } }
class MapStub {
  constructor() { this.sources = new Map(); this.layers = new Map(); this.zLevel = 1; this.zoom = 18; }
  on(name, callback) { if (name === "load") setTimeout(callback, 0); else this[name] = callback; }
  addSource(id) { this.sources.set(id, new Source()); }
  getSource(id) { return this.sources.get(id); }
  addLayer(layer) { this.layers.set(layer.id, layer); }
  getLayer(id) { return this.layers.get(id); }
  setPaintProperty() {} setFilter() {} getZLevel() { return this.zLevel; }
  setZLevel(value) { this.zLevel = value; } getZoom() { return this.zoom; }
  easeTo() {} flyTo() {} stop() {} resize() {}
}
class Marker { setLngLat() { return this; } addTo() { return this; } remove() {} }
window.Mazemap = {
  Config: { setMazemapViewToken(value) { window.__mapAccessUsed = value; } },
  Map: MapStub, MazeMarker: Marker,
  Data: {
    async getPoiAt() { return null; },
    async getPoi() { throw new Error("POI lookup is not used"); },
    async getAtoBTrip() { return { type: "FeatureCollection", features: [] }; },
    async getRouteJSON(from, to) {
      return { type: "FeatureCollection", features: [{ type: "Feature",
        properties: { z: from.zLevel }, geometry: { type: "LineString",
          coordinates: [[from.lngLat.lng, from.lngLat.lat],
            [to.lngLat.lng, to.lngLat.lat]] } }] };
    },
  },
};`;
