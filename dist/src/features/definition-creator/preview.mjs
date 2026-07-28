import {
  createPreviewProjection,
  distinctPreviewLevels,
  previewZ,
} from "./preview-projection.mjs";

export function routePreviewMarkup(stops, legs, checkpoints) {
  const routePoints = legs.flatMap(leg => leg.geometry ?? []);
  const extentPoints = routePoints.length ? routePoints : stops;
  if (!extentPoints.length) return emptyMarkup();
  const levels = distinctPreviewLevels([
    ...extentPoints,
    ...stops,
    ...checkpoints,
  ]);
  const projection = createPreviewProjection(extentPoints, levels);
  const segments = legs.flatMap(splitLeg);
  const floorRoutes = segments
    .filter(segment => segment.kind === "floor")
    .sort((left, right) => left.z - right.z || left.order - right.order)
    .map(segment => routeMarkup(segment, projection.point))
    .join("");
  const rises = segments
    .filter(segment => segment.kind === "rise")
    .sort((left, right) => left.topZ - right.topZ || left.order - right.order)
    .map(segment => routeMarkup(segment, projection.point))
    .join("");
  const checkpointDots = checkpoints.map((checkpoint, index) => ({
    checkpoint, index, z: previewZ(checkpoint, levels[0]),
  })).sort(byLevelThenIndex).map(({ checkpoint, z }) => {
    const [x, y] = projection.point(checkpoint);
    return `<circle class="checkpoint-dot" cx="${round(x)}" cy="${round(y)}" `
      + `r="4" data-sequence="${escapeText(checkpoint.sequence)}" `
      + `data-z="${z}"></circle>`;
  }).join("");
  const stopDots = stops.map((stop, index) => ({
    stop, index, z: previewZ(stop, levels[0]),
  })).sort(byLevelThenIndex).map(({ stop, index, z }) => {
    const [x, y] = projection.point(stop);
    return `<g class="stop-dot" data-stop-id="${escapeText(stop.id)}" data-z="${z}">`
      + `<circle cx="${round(x)}" cy="${round(y)}" r="8"></circle>`
      + `<text x="${round(x + 11)}" y="${round(y - 11)}">${index + 1}</text>`
      + `<title>${escapeText(stop.name)} · z${escapeText(stop.z)}</title></g>`;
  }).join("");
  return accessibleMarkup(stops.length, levels)
    + `<g class="route-preview">${planesMarkup(levels, projection.plane)}`
    + `${floorRoutes}${rises}${checkpointDots}${stopDots}</g>`;
}
function splitLeg(leg, legIndex) {
  const points = leg.geometry ?? [];
  if (points.length < 2) return [];
  const segments = [];
  let run = [points[0]];
  for (let index = 1; index < points.length; index++) {
    const from = points[index - 1];
    const to = points[index];
    const fromZ = previewZ(from);
    const toZ = previewZ(to);
    if (fromZ === toZ) run.push(to);
    else {
      if (run.length > 1) segments.push({
        kind: "floor", leg, order: legIndex * 1000 + index, points: run, z: fromZ,
      });
      segments.push({
        kind: "rise", leg, order: legIndex * 1000 + index,
        points: [from, to], fromZ, toZ, topZ: Math.max(fromZ, toZ),
      });
      run = [to];
    }
  }
  if (run.length > 1) segments.push({
    kind: "floor", leg, order: legIndex * 1000 + points.length,
    points: run, z: previewZ(run[0]),
  });
  return segments;
}
function routeMarkup(segment, project) {
  const points = segment.points.map(point => project(point).map(round).join(",")).join(" ");
  const attributes = segment.kind === "rise"
    ? `data-from-z="${segment.fromZ}" data-to-z="${segment.toZ}"`
    : `data-z="${segment.z}"`;
  const classes = segment.kind === "rise" ? "route-line route-rise" : "route-line";
  return `<polyline class="${classes}" points="${points}" `
    + `data-leg-id="${escapeText(segment.leg.id)}" ${attributes}></polyline>`;
}
function planesMarkup(levels, plane) {
  return levels.map(z => {
    const corners = plane(z);
    const points = corners.map(point => point.map(round).join(",")).join(" ");
    const [x, y] = corners[3];
    return `<polygon class="route-level-plane" points="${points}" data-z="${z}" `
      + `aria-hidden="true"></polygon><text class="route-level-label" `
      + `x="${round(x + 7)}" y="${round(y + 17)}" aria-hidden="true">z${z}</text>`;
  }).join("");
}

function byLevelThenIndex(left, right) {
  return left.z - right.z || left.index - right.index;
}

function accessibleMarkup(stopCount, levels) {
  const noun = stopCount === 1 ? "stop" : "stops";
  return `<title id="creator-route-preview-title">Route preview: ${stopCount} ${noun} `
    + `across z-levels ${levels.map(z => `z${z}`).join(", ")}</title>`
    + '<desc id="creator-route-preview-desc">Higher z-levels are offset upward and right. '
    + "Dashed links indicate transitions between levels.</desc>";
}

function emptyMarkup() {
  return '<title id="creator-route-preview-title">Empty route preview</title>'
    + '<desc id="creator-route-preview-desc">Add a stop to preview the route.</desc>'
    + '<text x="300" y="180" text-anchor="middle">Add a stop to preview the route</text>';
}

function escapeText(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function round(value) {
  return Math.round(value * 10) / 10;
}
