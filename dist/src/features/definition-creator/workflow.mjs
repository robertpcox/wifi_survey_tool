import {
  createRouteLegV3,
  generateRouteCheckpointsV3,
} from "../../domain/creator-route-v3.mjs";
import {
  authorSurveyDefinitionV3,
  importSurveyDefinitionV3,
} from "../../domain/definition-authoring-v3.mjs";
import { estimateRouteDuration } from "../../domain/route-duration-v3.mjs";
import {
  creatorRouteResult,
  updateCreatorRouteDwell,
} from "./workflow-route.mjs";
import { createCreatorRouting } from "./workflow-routing.mjs";

const DEFAULT_DOMAIN = Object.freeze({
  authorSurveyDefinitionV3,
  createRouteLegV3,
  estimateRouteDuration,
  generateRouteCheckpointsV3,
  importSurveyDefinitionV3,
});

export function createCreatorWorkflow({
  routeProvider = directGeometry,
  now,
  cryptoRef,
  domain = DEFAULT_DOMAIN,
} = {}) {
  const routing = createCreatorRouting({ domain, routeProvider });

  function reviewImported(imported) {
    const definition = imported.previousDefinition;
    return creatorRouteResult(
      domain,
      imported.legs,
      definition.route.checkpoints,
      domain.generateRouteCheckpointsV3(
        imported.stops,
        imported.legs,
        imported.checkpointSpacingM,
      ).shortLegs,
      imported.checkpointDwellSeconds,
    );
  }

  function author(parsed, route, imported = null) {
    const input = {
      ...(imported || {}),
      meta: parsed.meta,
      routeId: parsed.routeId,
      stops: route.stops,
      legs: route.legs,
      checkpoints: route.checkpoints,
      checkpointSpacingM: parsed.plan.spacingM,
      checkpointDwellSeconds: imported?.checkpointDwellSeconds ?? 0,
    };
    if (!imported) delete input.previousDefinition;
    return domain.authorSurveyDefinitionV3(input, { now, cryptoRef });
  }

  return {
    append: routing.append,
    author,
    cancel: routing.cancel,
    importDefinition: value => domain.importSurveyDefinitionV3(value),
    rebuild: routing.rebuild,
    replan: routing.replan,
    reviewImported,
    updateCheckpointDwell: (route, sequence, dwellSeconds) => (
      updateCreatorRouteDwell(domain, route, sequence, dwellSeconds)
    ),
  };
}

export function shortLegWarning(shortLegs, stops) {
  if (!shortLegs.length) return null;
  const names = new Map(stops.map(stop => [stop.id, stop.name]));
  const pairs = shortLegs.map(leg => {
    const from = names.get(leg.fromStopId) ?? leg.fromStopId;
    const to = names.get(leg.toStopId) ?? leg.toStopId;
    return `${from} → ${to} (${leg.distanceM.toFixed(1)} m)`;
  });
  return `Short leg: ${pairs.join(", ")}. No intermediate checkpoint was added.`;
}

function directGeometry(from, to) {
  return [
    { lng: from.lng, lat: from.lat, z: from.z },
    { lng: to.lng, lat: to.lat, z: to.z },
  ];
}
