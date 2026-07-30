import {
  respondRunnerBrowserRequest,
  RUNNER_BROWSER_POSITION,
} from "./runner_browser_responses.mjs";

export { RUNNER_BROWSER_POSITION };

export async function installRunnerBrowserEnvironment(
  page,
  origin,
  definition,
) {
  const responseState = {};
  await page.evaluateOnNewDocument(installBrowserDoubles);
  await page.setRequestInterception(true);
  page.on("request", request => {
    void respondRunnerBrowserRequest(request, origin, definition, responseState);
  });
  return responseState;
}

function installBrowserDoubles() {
  class Source { setData(data) { this.data = data; } }
  class MapStub {
    constructor(options) {
      this.layers = new Map(["mm-walls-extrusion", "mm-area-extrusion"]
        .map(id => [id, { id }]));
      this.options = options;
      this.sources = new Map();
      this.zLevel = 1;
      window.__runnerMap = this;
      window.__runner3dLaunchConfigs = [
        ...(window.__runner3dLaunchConfigs || []),
        options.threeD ? structuredClone(options.threeD) : null,
      ];
    }
    on(name, callback) {
      if (name === "load") setTimeout(callback, 0);
      if (name === "click") window.__runnerMapClick = callback;
    }
    addSource(id) { this.sources.set(id, new Source()); }
    getSource(id) { return this.sources.get(id); }
    addLayer(layer, beforeLayerId) {
      this.layers.set(layer.id, layer);
      window.__runnerLayerPlacements = {
        ...(window.__runnerLayerPlacements || {}),
        [layer.id]: beforeLayerId ?? null,
      };
    }
    getLayer(id) { return this.layers.get(id); }
    addControl(control, placement) {
      window.__runnerFloorControls = [...(window.__runnerFloorControls || []), {
        options: structuredClone(control.options), placement,
      }];
    }
    getZLevel() { return this.zLevel; }
    setZLevel(value) {
      this.zLevel = value;
      window.__runnerZHistory = [...(window.__runnerZHistory || []), value];
    }
    getZoom() { return 18; }
    easeTo(camera) {
      window.__runnerCamera = {
        ...(window.__runnerCamera || {}),
        ...structuredClone(camera),
      };
    }
    flyTo(camera) {
      window.__runnerCamera = {
        ...(window.__runnerCamera || {}),
        ...structuredClone(camera),
      };
    }
    enable3d() {
      window.__runner3dHistory = [...(window.__runner3dHistory || []), true];
    }
    disable3d() {
      window.__runner3dHistory = [...(window.__runner3dHistory || []), false];
    }
    fitBounds(bounds, options) {
      window.__runnerFitBounds = {
        bounds: structuredClone(bounds),
        options: structuredClone(options),
      };
    }
    remove() { window.__runnerMapRemoveCount = (window.__runnerMapRemoveCount || 0) + 1; }
    resize() { window.__runnerResizeCount = (window.__runnerResizeCount || 0) + 1; }
    setFilter(id, filter) {
      window.__runnerFilters = {
        ...(window.__runnerFilters || {}),
        [id]: structuredClone(filter),
      };
    }
    setPaintProperty(id, property, value) {
      window.__runnerPaint = {
        ...(window.__runnerPaint || {}),
        [`${id}.${property}`]: structuredClone(value),
      };
    }
    stop() {}
  }
  class Marker {
    constructor(options) {
      window.__runnerMarker = structuredClone(options);
    }
    setLngLat(point) {
      window.__runnerMarkerPoint = structuredClone(point);
      return this;
    }
    addTo() { return this; }
    remove() {
      window.__runnerMarkerRemoveCount = (window.__runnerMarkerRemoveCount || 0) + 1;
    }
  }
  class ZLevelBarControl { constructor(options) { this.options = options; } }
  window.Mazemap = {
    Config: { setMazemapViewToken(value) {
      window.__runnerMapAccessUsed = Boolean(value);
    } },
    Map: MapStub,
    MazeMarker: Marker,
    ZLevelBarControl,
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
      async getBuildingsByCampusId() { return []; },
      async getFloorsByCampusId() { return []; },
    },
  };
  URL.createObjectURL = blob => {
    window.__runnerBlob = blob;
    return "blob:runner-result";
  };
  URL.revokeObjectURL = () => {};
  HTMLAnchorElement.prototype.click = function captureClick() {
    window.__runnerDownloadName = this.download;
  };
}
