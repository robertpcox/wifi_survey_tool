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
  applyCreatorCheckpointDwells,
} from "./checkpoint-dwell.mjs";
import {
  creatorRouteResult,
  updateCreatorRouteDwell,
} from "./workflow-route.mjs";

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
  let revision = 0;

  async function rebuild(stops, plan, previousRoute = null) {
    const buildRevision = ++revision;
    if (stops.length < 2) {
      return creatorRouteResult(domain, [], [], [], 0);
    }
    const legs = [];
    for (let index = 0; index < stops.length - 1; index++) {
      const from = stops[index];
      const to = stops[index + 1];
      let geometry;
      try {
        geometry = await routeProvider(from, to);
      } catch (error) {
        if (buildRevision !== revision) return { stale: true };
        throw new Error(`Route ${from.name} → ${to.name}: ${error.message}`);
      }
      if (buildRevision !== revision) return { stale: true };
      try {
        legs.push(domain.createRouteLegV3(from, to, geometry, index));
      } catch (error) {
        throw new Error(`Route ${from.name} → ${to.name}: ${error.message}`);
      }
    }
    const generated = domain.generateRouteCheckpointsV3(
      stops,
      legs,
      plan.spacingM,
    );
    const checkpoints = applyCreatorCheckpointDwells(
      generated.checkpoints,
      legs,
      plan,
      previousRoute,
    );
    return creatorRouteResult(
      domain,
      legs,
      checkpoints,
      generated.shortLegs,
      0,
    );
  }

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
    author,
    cancel() {
      revision++;
    },
    importDefinition: value => domain.importSurveyDefinitionV3(value),
    rebuild,
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
