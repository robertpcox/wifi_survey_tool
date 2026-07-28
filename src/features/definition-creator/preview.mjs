const WIDTH = 600;
const HEIGHT = 360;
const PADDING = 28;

export function routePreviewMarkup(stops, legs, checkpoints) {
  const points = legs.flatMap(leg => leg.geometry ?? []);
  const extentPoints = points.length ? points : stops;
  if (!extentPoints.length) {
    return '<text x="300" y="180" text-anchor="middle">Add a stop to preview the route</text>';
  }
  const project = projector(extentPoints);
  const routes = legs.map(leg => {
    const coordinates = leg.geometry.map(point => {
      const [x, y] = project(point);
      return `${round(x)},${round(y)}`;
    }).join(" ");
    return `<polyline class="route-line" points="${coordinates}" `
      + `data-leg-id="${escapeText(leg.id)}"></polyline>`;
  }).join("");
  const checkpointDots = checkpoints.map(checkpoint => {
    const [x, y] = project(checkpoint);
    return `<circle class="checkpoint-dot" cx="${round(x)}" cy="${round(y)}" `
      + `r="4" data-sequence="${checkpoint.sequence}"></circle>`;
  }).join("");
  const stopDots = stops.map((stop, index) => {
    const [x, y] = project(stop);
    return `<g class="stop-dot" data-stop-id="${escapeText(stop.id)}">`
      + `<circle cx="${round(x)}" cy="${round(y)}" r="8"></circle>`
      + `<text x="${round(x + 11)}" y="${round(y - 11)}">${index + 1}</text>`
      + `<title>${escapeText(stop.name)} · z${escapeText(stop.z)}</title></g>`;
  }).join("");
  return `<g class="route-preview">${routes}${checkpointDots}${stopDots}</g>`;
}

function projector(points) {
  const lngs = points.map(point => Number(point.lng));
  const lats = points.map(point => Number(point.lat));
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const lngSpan = maxLng - minLng || 1;
  const latSpan = maxLat - minLat || 1;
  const scale = Math.min(
    (WIDTH - PADDING * 2) / lngSpan,
    (HEIGHT - PADDING * 2) / latSpan,
  );
  const drawnWidth = (maxLng - minLng) * scale;
  const drawnHeight = (maxLat - minLat) * scale;
  const offsetX = (WIDTH - drawnWidth) / 2;
  const offsetY = (HEIGHT - drawnHeight) / 2;
  return point => [
    offsetX + (Number(point.lng) - minLng) * scale,
    HEIGHT - offsetY - (Number(point.lat) - minLat) * scale,
  ];
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function round(value) {
  return Math.round(value * 10) / 10;
}
