import { bearing, haversine, lerp } from "./geometry.mjs";
import { CHECKPOINT_RULES } from "./route-contract.mjs";
import { stopName } from "./stop-targets.mjs";

export function generateCheckpoints(stops, legs, spacingM) {
  const context = {
    id: 0,
    order: 0,
    waypoints: [],
  };
  const spacing = Number(spacingM);
  legs.forEach((leg, legIndex) => {
    const legWaypoints = buildLegWaypoints(leg, legIndex, spacing, context);
    appendPrunedLeg(legWaypoints, context);
  });
  finalizeCheckpoints(context.waypoints, stops, legs);
  return context.waypoints;
}

export const generateWaypoints = generateCheckpoints;

function buildLegWaypoints(leg, legIndex, spacing, context) {
  const points = leg.coords;
  const marks = significantMarks(points, legIndex);
  const waypoints = [];
  marks.forEach((mark, markIndex) => {
    if (mark.kind) {
      waypoints.push(makeCheckpoint(points[mark.index], mark.kind, legIndex, context));
    }
    if (spacing > 0 && markIndex < marks.length - 1) {
      addIntervalCheckpoints(
        points,
        mark.index,
        marks[markIndex + 1].index,
        spacing,
        legIndex,
        context,
        waypoints,
      );
    }
  });
  return waypoints.sort((a, b) => a._order - b._order);
}

function significantMarks(points, legIndex) {
  const marks = [{ index: 0, kind: legIndex === 0 ? "stop" : null }];
  for (let index = 1; index < points.length - 1; index++) {
    if (points[index].z !== points[index - 1].z) {
      marks.push({ index, kind: "floor" });
      continue;
    }
    const previousDistance = haversine(points[index - 1], points[index]);
    const nextDistance = haversine(points[index], points[index + 1]);
    if (previousDistance < 2 || nextDistance < 2) continue;
    let difference = Math.abs(
      bearing(points[index - 1], points[index])
        - bearing(points[index], points[index + 1]),
    );
    if (difference > 180) difference = 360 - difference;
    if (difference >= CHECKPOINT_RULES.turnDegrees) {
      marks.push({ index, kind: "turn" });
    }
  }
  marks.push({ index: points.length - 1, kind: "stop" });
  return marks;
}

function addIntervalCheckpoints(
  points,
  startIndex,
  endIndex,
  spacing,
  legIndex,
  context,
  waypoints,
) {
  let accumulated = 0;
  for (let index = startIndex; index < endIndex; index++) {
    const distance = haversine(points[index], points[index + 1]);
    if (distance <= 0) continue;
    let travelled = 0;
    while (accumulated + (distance - travelled) >= spacing) {
      const needed = spacing - accumulated;
      const fraction = (travelled + needed) / distance;
      const point = lerp(points[index], points[index + 1], fraction);
      waypoints.push(makeCheckpoint(point, "mid", legIndex, context));
      travelled += needed;
      accumulated = 0;
    }
    accumulated += distance - travelled;
  }
}

function appendPrunedLeg(legWaypoints, context) {
  let previous = null;
  for (const waypoint of legWaypoints) {
    const close = previous
      && haversine(previous, waypoint) < CHECKPOINT_RULES.minimumGapM;
    if (close && waypoint.kind === "mid") continue;
    if (close && previous.kind === "mid") {
      context.waypoints.pop();
      previous = context.waypoints.at(-1) || null;
    }
    waypoint.id = context.id++;
    context.waypoints.push(waypoint);
    previous = waypoint;
  }
}

function finalizeCheckpoints(waypoints, stops, legs) {
  waypoints.forEach((waypoint, index) => {
    waypoint.seq = index;
    if (waypoint.kind === "stop") {
      const leg = legs[waypoint.legIdx];
      const stopIndex = index === 0 && waypoint.legIdx === 0
        ? leg.fromIdx
        : leg.toIdx;
      waypoint.name = stopName(stops, stopIndex);
      waypoint.stopIdx = stopIndex;
    }
    waypoint.state = "pending";
    delete waypoint._order;
  });
}

function makeCheckpoint(point, kind, legIndex, context) {
  const names = {
    stop: "Stop",
    turn: "Turn point",
    floor: "Floor change",
    mid: "Checkpoint",
  };
  return {
    id: -1,
    legIdx: legIndex,
    kind,
    name: names[kind],
    lng: point.lng,
    lat: point.lat,
    z: point.z,
    state: "pending",
    _order: context.order++,
  };
}
