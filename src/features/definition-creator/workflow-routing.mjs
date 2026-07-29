// FEATURE:      Creator route operations
// SURFACE:      createCreatorRouting(options)
// WHY TOGETHER: Append, replan, and reshuffle share route generation and stale-response policy.
// STATE:        Monotonic routing revision
// RULES:        Append calls only the new leg; replan calls no provider; rebuild routes every leg.
// PROVENANCE:   Creator field feedback

import { applyCreatorCheckpointDwells } from "./checkpoint-dwell.mjs";
import { creatorRouteResult } from "./workflow-route.mjs";

export function createCreatorRouting({ domain, routeProvider }) {
  let revision = 0;

  async function append(stops, plan, previousRoute) {
    const buildRevision = ++revision;
    if (stops.length < 2) return finish(stops, [], plan, previousRoute);
    const priorLegs = reusableLegs(stops, previousRoute, stops.length - 2);
    const index = stops.length - 2;
    const leg = await routedLeg(stops[index], stops[index + 1], index, buildRevision);
    if (leg.stale) return leg;
    return finish(stops, [...priorLegs, leg], plan, previousRoute);
  }

  async function rebuild(stops, plan, previousRoute = null) {
    const buildRevision = ++revision;
    const legs = [];
    for (let index = 0; index < stops.length - 1; index++) {
      const leg = await routedLeg(
        stops[index],
        stops[index + 1],
        index,
        buildRevision,
      );
      if (leg.stale) return leg;
      legs.push(leg);
    }
    return finish(stops, legs, plan, previousRoute);
  }

  function replan(stops, plan, previousRoute) {
    revision++;
    const legs = reusableLegs(
      stops,
      previousRoute,
      Math.max(0, stops.length - 1),
    );
    return finish(stops, legs, plan, previousRoute);
  }

  async function routedLeg(from, to, index, buildRevision) {
    let geometry;
    try {
      geometry = await routeProvider(from, to);
    } catch (error) {
      if (buildRevision !== revision) return { stale: true };
      throw new Error(`Route ${from.name} → ${to.name}: ${error.message}`);
    }
    if (buildRevision !== revision) return { stale: true };
    try {
      return domain.createRouteLegV3(from, to, geometry, index);
    } catch (error) {
      throw new Error(`Route ${from.name} → ${to.name}: ${error.message}`);
    }
  }

  function finish(stops, legs, plan, previousRoute) {
    if (stops.length < 2) {
      return creatorRouteResult(domain, [], [], [], 0);
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

  return {
    append,
    cancel() { revision++; },
    rebuild,
    replan,
  };
}

function reusableLegs(stops, route, expectedCount) {
  const legs = route?.legs ?? [];
  if (legs.length !== expectedCount) {
    throw new Error("Current route geometry cannot be reused; reshuffle the route first.");
  }
  legs.forEach((leg, index) => {
    if (
      leg.fromStopId !== stops[index]?.id
      || leg.toStopId !== stops[index + 1]?.id
    ) {
      throw new Error("Current route order cannot be reused; reshuffle the route first.");
    }
  });
  return legs;
}
