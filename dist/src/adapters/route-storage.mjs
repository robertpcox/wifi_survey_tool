const DEFAULT_KEY = "routeSurvey.v1.routes";

export function createRouteRepository(options = {}) {
  const storage = options.storage ?? localStorage;
  const fetchImpl = options.fetchImpl ?? fetch;
  const storageKey = options.storageKey ?? DEFAULT_KEY;
  const manifestUrl = options.manifestUrl ?? "/data/routes/index.json";
  const routeUrl = options.routeUrl
    ?? (file => `/data/routes/${encodeURIComponent(file)}`);

  function savedRouteMap() {
    try {
      return JSON.parse(storage.getItem(storageKey) || "{}");
    } catch {
      return {};
    }
  }

  function saveRoute(name, definition) {
    const routes = savedRouteMap();
    routes[name] = definition;
    storage.setItem(storageKey, JSON.stringify(routes));
  }

  function deleteRoute(name) {
    const routes = savedRouteMap();
    delete routes[name];
    storage.setItem(storageKey, JSON.stringify(routes));
  }

  async function loadServerRouteManifest() {
    const response = await fetchImpl(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const manifest = await response.json();
    const entries = Array.isArray(manifest) ? manifest : manifest.routes;
    if (!Array.isArray(entries)) throw new Error("manifest has no routes array");
    return entries.map(normalizeManifestEntry);
  }

  async function loadServerRoute(entry) {
    const response = await fetchImpl(routeUrl(entry.file), { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  return {
    deleteRoute,
    loadServerRoute,
    loadServerRouteManifest,
    saveRoute,
    savedRouteMap,
  };
}

function normalizeManifestEntry(entry, index) {
  const item = typeof entry === "string" ? { file: entry } : entry;
  const file = String(item?.file || "").trim();
  const invalidPath = file.includes("..")
    || file.includes("/")
    || file.includes("\\");
  if (!file || invalidPath || !file.toLowerCase().endsWith(".json")) {
    throw new Error(`route ${index + 1} has an invalid file name`);
  }
  return {
    name: String(item.name || file.replace(/\.json$/i, "")).trim(),
    file,
    campusId: item.campusId ?? null,
    floor: item.floor ?? null,
  };
}

export function savedRouteStops(entry) {
  return Array.isArray(entry) ? entry : entry?.stops;
}
