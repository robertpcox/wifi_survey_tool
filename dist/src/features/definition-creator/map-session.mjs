import { createCreatorMapAccess } from "./map-access.mjs";
export function createCreatorMapSession({
  credentials,
  mapAdapter,
  view,
}) {
  let clickRevision = 0;
  const mapAccess = createCreatorMapAccess({ credentials, view });
  async function engage() {
    if (typeof mapAdapter?.launch !== "function") {
      throw new Error("MazeMap SDK loader is unavailable.");
    }
    const fields = view.readFields();
    const customerId = required(fields.customerId, "customerId");
    const customerName = required(fields.customerName, "customerName");
    const campusId = required(fields.campusId, "campusId");
    const access = mapAccess.take();
    view.setStatus("Loading the MazeMap campus…");
    let initialZ;
    try {
      initialZ = await mapAdapter.launch(
        access,
        event => void onMapClick(event),
        { campusId },
      );
    } catch (error) {
      mapAccess.rethrow(error, access);
    }
    const campusName = required(mapAdapter.campusName, "MazeMap campus name");
    view.writeFields({ campusId, campusName, needsMapAccess: Boolean(access) });
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
    return { campusId, campusName, customerId, customerName,
      mapAccessRequired: Boolean(access) };
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
      if (!context) return stageCoordinateChoice(view, lng, lat, z);
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
      const hasPoiCenter = context.poi?.id && context.poi?.center;
      view.setStatus(
        hasPoiCenter
          ? `${context.building.name} · ${context.floor.name}: choose the clicked point or POI centre.`
          : `${context.building.name} · ${context.floor.name}: use the clicked coordinates.`,
        "ok",
      );
      return context;
    } catch (error) {
      if (revision !== clickRevision) return null;
      if (isCoordinateMiss(error)) {
        return stageCoordinateChoice(view, lng, lat, z);
      }
      view.clearMapSelection?.();
      view.setStatus(`Map click: ${error.message}`, "error");
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

function stageCoordinateChoice(view, lng, lat, z) {
  const context = {
    coordinateOnly: true,
    building: { id: null, name: null },
    floor: { id: null, name: `z${z}`, z },
    poi: { center: null, id: null, name: null },
  };
  view.writeMapSelection({
    locationType: "room",
    poiId: "",
    stopLat: lat,
    stopLng: lng,
    stopName: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    stopZ: z,
  }, context);
  view.showMapChoice?.({ clicked: { lat, lng, z }, context });
  view.setStatus(
    "Clicked coordinates are ready. Use the clicked point to add this route stop.",
    "ok",
  );
  return context;
}

function isCoordinateMiss(error) {
  const status = Number(error?.status ?? error?.response?.status);
  const code = String(error?.code ?? "").toUpperCase();
  const message = String(error?.message ?? error);
  return status === 404 || ["404", "NOT_FOUND"].includes(code)
    || /^no (?:poi|building|floor)\b.*\bfound\b/i.test(message)
    || /^(?:poi|point|resource) not found\b|^HTTP 404\b/i.test(message);
}
