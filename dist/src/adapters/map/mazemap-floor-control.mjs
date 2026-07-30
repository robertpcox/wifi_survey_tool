// FEATURE:      Optional custom MazeMap floor control
// SURFACE:      createMazeMapFloorControl(enabled)
// WHY TOGETHER: Constructor suppression and post-load attachment are one capability boundary.
// STATE:        Stateless; every map launch receives a fresh control instance.
// RULES:        Non-Runner maps and unsupported SDKs retain MazeMap's default floor control.
// PROVENANCE:   Runner field map floor selector placement

const FLOOR_BAR_OPTIONS = Object.freeze({
  autoUpdate: true,
  maxHeight: 400,
});

export function createMazeMapFloorControl(enabled = false) {
  const requested = enabled === true;
  return Object.freeze({
    mapOptions(sdk, options) {
      return supportsCustomBar(requested, sdk)
        ? { ...options, zLevelControl: false }
        : options;
    },
    attach(sdk, map) {
      if (!supportsCustomBar(requested, sdk)
        || typeof map?.addControl !== "function") return false;
      try {
        const bar = new sdk.ZLevelBarControl({ ...FLOOR_BAR_OPTIONS });
        map.addControl(bar, "middle-right");
        return true;
      } catch {
        return false;
      }
    },
  });
}

function supportsCustomBar(requested, sdk) {
  return requested
    && typeof sdk?.ZLevelBarControl === "function"
    && typeof sdk?.Map?.prototype?.addControl === "function";
}
