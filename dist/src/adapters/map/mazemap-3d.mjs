// FEATURE:      Safe MazeMap 3D mode control
// SURFACE:      createMazeMap3dState(configuration)
// WHY TOGETHER: Constructor options, requested state, and safe SDK calls form one boundary.
// STATE:        Requested mode persists across caller-owned MazeMap instances.
// RULES:        Missing or throwing SDK methods return false without changing requested state.
// PROVENANCE:   Runner field map display control

export function createMazeMap3dState(configuration, perspectivePitch = 45) {
  const threeD = configuration ? { ...configuration } : null;
  const targetPitch = threeD ? normalizePitch(perspectivePitch) : 0;
  let enabled = Boolean(threeD);
  return Object.freeze({
    apply(map) {
      return threeD ? invoke(map, enabled, threeD) : false;
    },
    mapOptions(container, campuses, center) {
      const options = { container, campuses, zoom: 18, center };
      if (threeD) options.threeD = { ...threeD };
      return options;
    },
    set(map, value) {
      const next = Boolean(value);
      if (!invoke(map, next, threeD)) return false;
      enabled = next;
      movePitch(map, enabled ? targetPitch : 0);
      return true;
    },
    get enabled() { return enabled; },
    get pitch() { return enabled ? targetPitch : 0; },
  });
}

function invoke(map, enabled, options) {
  const method = enabled ? "enable3d" : "disable3d";
  if (typeof map?.[method] !== "function") return false;
  try {
    if (enabled) map[method]({ ...options });
    else map[method]();
    return true;
  } catch {
    return false;
  }
}

function movePitch(map, pitch) {
  const camera = { pitch, duration: 350 };
  try {
    if (typeof map?.easeTo === "function") map.easeTo(camera);
    else if (typeof map?.flyTo === "function") map.flyTo(camera);
    else if (typeof map?.setPitch === "function") map.setPitch(pitch);
  } catch {}
}

function normalizePitch(value) {
  const pitch = Number(value);
  return Number.isFinite(pitch) ? Math.max(0, Math.min(85, pitch)) : 45;
}
