// FEATURE:      Report Player analysis
// SURFACE:      reportAnalysisOptions(result, selected, defaults)
// WHY TOGETHER: Threshold normalization and configured floor labels gate every analysis pass.
// STATE:        None
// RULES:        Thresholds are non-negative and every configured z-level has a meta name.
// PROVENANCE:   Scope/contracts/report_analysis.md

export function reportAnalysisOptions(result, selected, defaults) {
  const thresholds = {
    stickySeconds: threshold(selected.stickySeconds, "stickySeconds"),
    accuracyM: threshold(selected.accuracyM, "accuracyM"),
    noPositionSeconds: threshold(
      selected.noPositionSeconds ?? defaults.noPositionSeconds,
      "noPositionSeconds",
    ),
  };
  const floors = (result?.meta?.zLevels ?? []).map(z => {
    const name = result.meta.zLevelNames?.[String(z)];
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError(`meta.zLevelNames.${z}: must name every configured floor`);
    }
    return { z, name };
  });
  if (!floors.length) throw new TypeError("meta.zLevels: must contain a floor");
  return { floors, thresholds };
}

function threshold(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name}: must be a non-negative finite number`);
  }
  return value;
}
