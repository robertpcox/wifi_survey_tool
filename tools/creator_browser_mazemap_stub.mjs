export async function installCreatorMazeMapStub(page, origin) {
  await page.evaluateOnNewDocument(installMazemap);
  await page.setRequestInterception(true);
  page.on("request", request => {
    void respond(request, origin);
  });
}
async function respond(request, origin) {
  const url = request.url();
  if (url.endsWith("mazemap.min.css")) {
    await request.respond({ status: 200, contentType: "text/css", body: "" });
  } else if (url.endsWith("/favicon.ico")) {
    await request.respond({ status: 204 });
  } else if (url.startsWith(origin)) {
    await request.continue();
  } else {
    await request.abort("blockedbyclient");
  }
}
function installMazemap() {
  class Source { setData(data) { this.data = data; } }
  class MapStub {
    constructor(options) {
      this.events = {};
      this.layers = new Map();
      this.options = options;
      this.sources = new Map();
      this.zLevel = 1;
      this.zoom = 18;
      window.__creatorMap = this;
    }
    on(name, callback) {
      if (name === "load") setTimeout(callback, 0);
      else this.events[name] = callback;
    }
    addSource(id) {
      this.sources.set(id, new Source());
    }
    getSource(id) {
      return this.sources.get(id);
    }
    addLayer(layer) {
      this.layers.set(layer.id, layer);
    }
    getLayer(id) {
      return this.layers.get(id);
    }
    getZLevel() {
      return this.zLevel;
    }
    setZLevel(value) {
      this.zLevel = value;
    }
    getZoom() {
      return this.zoom;
    }
    easeTo() {}
    flyTo() {}
    remove() {}
    resize() {}
    setFilter() {}
    setPaintProperty() {}
    stop() {}
  }
  class Marker {
    setLngLat() { return this; }
    addTo() { return this; }
    remove() {}
  }
  const pointPoi = (lng, lat, z, id = `poi:${lng}:${lat}:${z}`) => ({
    id,
    geometry: { type: "Point", coordinates: [lng + 0.00004, lat + 0.00002] },
    properties: {
      buildingId: "building-a",
      buildingName: "Clinical Services Building",
      floorId: "floor-a",
      floorName: "Level 00",
      poiId: id,
      title: `Mapped ${lng}`,
      zLevel: z,
    },
  });
  window.Mazemap = {
    Config: {
      setMazemapViewToken(value) {
        window.__mapAccessUsed = Boolean(value);
      },
    },
    Map: MapStub,
    MazeMarker: Marker,
    Data: {
      async getCampus(id) {
        return {
          geometry: {
            type: "Polygon",
            coordinates: [[
              [170.49, -45.88],
              [170.51, -45.88],
              [170.51, -45.86],
              [170.49, -45.86],
            ]],
          },
          properties: { campusId: id, name: "Dunedin Hospital" },
        };
      },
      async getBuildingsByCampusId() {
        return [{
          properties: {
            buildingId: "building-a",
            name: "Clinical Services Building",
          },
        }];
      },
      async getFloorsByCampusId() {
        return [{
          properties: {
            buildingId: "building-a",
            floorId: "floor-a",
            name: "Level 00",
            z: 1,
          },
        }];
      },
      async getPoiAt({ lng, lat }, z) {
        return pointPoi(lng, lat, z);
      },
      async getPoi(id) {
        const [, lng, lat, z] = String(id).split(":");
        return pointPoi(Number(lng), Number(lat), Number(z), String(id));
      },
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
}
