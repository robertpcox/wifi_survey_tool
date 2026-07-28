export function createCreatorMapSession({
  credentials,
  mapAdapter,
  view,
}) {
  let clickRevision = 0;

  async function engage() {
    if (typeof mapAdapter?.launch !== "function") {
      throw new Error("MazeMap SDK loader is unavailable.");
    }
    const fields = view.readFields();
    const customerId = required(fields.customerId, "customerId");
    const customerName = required(fields.customerName, "customerName");
    const campusId = required(fields.campusId, "campusId");
    const enteredAccess = view.takeMapAccess?.();
    const access = enteredAccess || credentials?.read?.("mapAccess");
    if (!access) {
      throw new Error("MazeMap access token: is required before Engage");
    }
    credentials?.set?.("mapAccess", access);
    view.setStatus("Loading the MazeMap campus…");
    const initialZ = await mapAdapter.launch(
      access,
      event => void onMapClick(event),
      { campusId },
    );
    const campusName = required(
      mapAdapter.campusName,
      "MazeMap campus name",
    );
    view.writeFields({ campusId, campusName });
    if (Number.isFinite(Number(initialZ))) {
      view.writeFields({ gpsZ: Number(initialZ), stopZ: Number(initialZ) });
    }
    mapAdapter.startZWatch?.(z => {
      if (!Number.isFinite(Number(z))) return;
      view.clearMapSelection?.();
      view.writeFields({
        gpsZ: Number(z),
        stopLng: "",
        stopLat: "",
        stopZ: Number(z),
      });
    });
    view.setStatus(
      `${customerName} · ${campusName} launched. Click the map to add a route stop.`,
      "ok",
    );
    return { campusId, campusName, customerId, customerName };
  }

  async function onMapClick(event) {
    const revision = ++clickRevision;
    const lng = Number(event?.lngLat?.lng);
    const lat = Number(event?.lngLat?.lat);
    const z = Number(
      mapAdapter?.getMapZLevel?.() ?? mapAdapter?.currentZLevel,
    );
    if (![lng, lat, z].every(Number.isFinite)) {
      view.setStatus(
        "Map click: longitude, latitude, or z-level is unavailable.",
        "error",
      );
      return null;
    }
    if (typeof mapAdapter?.describePoint !== "function") {
      view.setStatus("Map click: MazeMap point lookup is unavailable.", "error");
      return null;
    }
    view.setStatus("Resolving the clicked building and floor…");
    try {
      const context = await mapAdapter.describePoint(lng, lat, z);
      if (revision !== clickRevision) return null;
      const pointZ = Number(context.floor?.z);
      view.writeMapSelection({
        locationType: "room",
        poiId: context.poi?.id ?? "",
        stopLat: lat,
        stopLng: lng,
        stopName: context.poi?.name ?? "Mapped point",
        stopZ: Number.isFinite(pointZ) ? pointZ : z,
      }, context);
      view.showMapChoice?.({
        clicked: {
          lat,
          lng,
          z: Number.isFinite(pointZ) ? pointZ : z,
        },
        context,
      });
      view.setStatus(
        `${context.building.name} · ${context.floor.name}: choose the clicked point or POI centre.`,
        "ok",
      );
      return context;
    } catch (error) {
      if (revision === clickRevision) {
        view.clearMapSelection?.();
        view.setStatus(`Map click: ${error.message}`, "error");
      }
      return null;
    }
  }

  return { engage, onMapClick };
}

function required(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name}: is required`);
  return text;
}
