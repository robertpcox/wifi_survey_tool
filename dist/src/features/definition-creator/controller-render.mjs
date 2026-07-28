import { deriveMapCoverage } from "./map-coverage.mjs";
import { shortLegWarning } from "./workflow.mjs";

export function renderCreatorController({
  mapAdapter,
  state,
  view,
}) {
  view.renderStops(state.stops, state.selectedIndex);
  view.renderLegs?.(state.stops, state.route);
  view.renderRoute(state.stops, state.route);
  view.renderCoverage?.(deriveMapCoverage({
    fallbackMeta: state.imported?.previousDefinition?.meta,
    legs: state.route.legs,
    stops: state.stops,
    strict: false,
  }));
  const warning = state.shortWarningDismissed
    ? null
    : shortLegWarning(state.route.shortLegs, state.stops);
  view.showShortWarning(warning);
  mapAdapter?.drawStops?.(state.stops);
  mapAdapter?.drawRoute?.(state.route.legs);
  mapAdapter?.drawWaypoints?.(state.route.checkpoints);
}
