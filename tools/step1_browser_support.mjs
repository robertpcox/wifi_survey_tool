export const mazemapStub = `
class FakeSource {
  setData(data) { this.data = data; }
}
class FakeMap {
  constructor() {
    this.sources = new Map();
    this.layers = new Map();
    this.zoom = 18;
    this.zLevel = 1;
  }
  on(name, callback) {
    if (name === "load") setTimeout(callback, 0);
    else this[name] = callback;
  }
  addSource(id) { this.sources.set(id, new FakeSource()); }
  getSource(id) { return this.sources.get(id); }
  addLayer(layer) { this.layers.set(layer.id, layer); }
  getLayer(id) { return this.layers.get(id); }
  setPaintProperty() {}
  setFilter() {}
  getZLevel() { return this.zLevel; }
  setZLevel(value) { this.zLevel = value; }
  getZoom() { return this.zoom; }
  easeTo() {}
  flyTo() {}
  stop() {}
  resize() {}
}
class FakeMarker {
  setLngLat() { return this; }
  addTo() { return this; }
  remove() {}
}
window.Mazemap = {
  Config: { setMazemapViewToken() {} },
  Map: FakeMap,
  MazeMarker: FakeMarker,
  Data: {
    async getPoiAt() { return null; },
    async getPoi() { throw new Error("POI lookup is not used by this smoke"); },
    async getAtoBTrip() { return { type: "FeatureCollection", features: [] }; },
    async getRouteJSON(from, to) {
      return {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { z: from.zLevel },
          geometry: {
            type: "LineString",
            coordinates: [
              [from.lngLat.lng, from.lngLat.lat],
              [to.lngLat.lng, to.lngLat.lat],
            ],
          },
        }],
      };
    },
  },
};
`;

export async function prepareSmokePage(page) {
  await page.evaluateOnNewDocument(() => {
    window.__step1Downloads = [];
    let latestBlob = null;
    URL.createObjectURL = blob => {
      latestBlob = blob;
      return "blob:step1-smoke";
    };
    URL.revokeObjectURL = () => {};
    HTMLAnchorElement.prototype.click = function click() {
      const record = { filename: this.download, type: latestBlob?.type };
      window.__step1Downloads.push(record);
      latestBlob?.text().then(content => {
        record.content = content;
      });
    };
  });
  await page.setRequestInterception(true);
  page.on("request", request => respondToRequest(request));
  const consoleErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => consoleErrors.push(error.message));
  return consoleErrors;
}

function respondToRequest(request) {
  const url = request.url();
  if (url.endsWith("mazemap.min.js")) {
    request.respond({
      status: 200,
      contentType: "text/javascript",
      body: mazemapStub,
    });
  } else if (url.endsWith("mazemap.min.css")) {
    request.respond({ status: 200, contentType: "text/css", body: "" });
  } else if (url.endsWith("/favicon.ico")) {
    request.respond({ status: 204 });
  } else if (url.includes("mm-positioning-proxy/position")) {
    request.respond({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        latitude: -45.87245,
        longitude: 170.5085,
        zLevel: 1,
        confidenceFactor: 0.9,
        lastSeen: Date.now(),
        locationName: "Browser smoke",
      }),
    });
  } else {
    request.continue();
  }
}
