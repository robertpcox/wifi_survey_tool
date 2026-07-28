// FEATURE:      Report Player shared map surface
// SURFACE:      createReportMapSurface(options)
// WHY TOGETHER: Public canvas and optional private-map enhancement are two modes of one surface.
// STATE:        Active result, floor, analysis, playback frame, and memory-only private adapter
// RULES:        Public route overlays always work; private tokens are passed through and never stored.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { createMapFrame } from "./map-model.mjs";

export function createReportMapSurface({
  result,
  canvas,
  publicElement,
  privateElement,
  createPrivateMap,
}) {
  let floor = result.meta.zLevels[0];
  let analysis = null;
  let frame = null;
  let heatKind = "sticky";
  let privateMap = null;

  function render(next = {}) {
    floor = next.floor ?? floor;
    analysis = next.analysis ?? analysis;
    frame = next.frame ?? frame;
    heatKind = next.heatKind ?? heatKind;
    const model = createMapFrame(result, { floor, analysis, frame, heatKind });
    drawPublic(canvas, model);
    privateMap?.setMapZLevel?.(floor);
    if (privateMap && frame) privateMap.drawPositionTrail(frame.polls ?? frame.pollTrail ?? []);
    return model;
  }

  async function usePrivate(token) {
    if (!createPrivateMap) throw new Error("Private map enhancement is unavailable");
    const adapter = createPrivateMap();
    await adapter.launch(token, null, { campusId: result.meta.campusId });
    adapter.drawRoute(result.route.legs);
    adapter.drawStops(result.route.stops);
    adapter.drawWaypoints(result.route.checkpoints);
    adapter.fitRoute(result.route);
    privateMap = adapter;
    publicElement.hidden = true;
    privateElement.hidden = false;
    render();
    return "private";
  }

  function usePublic() {
    privateMap = null;
    privateElement.hidden = true;
    publicElement.hidden = false;
    render();
    return "public";
  }

  usePublic();
  return Object.freeze({ render, usePrivate, usePublic, get mode() {
    return privateMap ? "private" : "public";
  } });
}

function drawPublic(canvas, model) {
  const context = canvas.getContext?.("2d");
  if (!context) return;
  const width = canvas.width || 900;
  const height = canvas.height || 460;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#edf2f7";
  context.fillRect(0, 0, width, height);
  drawGrid(context, width, height);
  for (const point of model.heat) {
    const radius = Math.min(36, 8 + Math.sqrt(point.weightSeconds || 0) * 5);
    context.fillStyle = "rgb(239 83 80 / 35%)";
    context.beginPath();
    context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    context.fill();
  }
  model.routeLines.forEach(line => drawLine(context, line, width, height, "#2457a6", 5));
  drawLine(context, model.pollTrail, width, height, "#e07a2d", 3);
  drawPoints(context, model.checkpoints, width, height, "#ffffff", "#14213d", 5);
  if (model.walker) drawPoints(context, [model.walker], width, height, "#20a47a", "#ffffff", 8);
}

function drawGrid(context, width, height) {
  context.strokeStyle = "#d5dee9";
  context.lineWidth = 1;
  for (let offset = 40; offset < width; offset += 40) {
    context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset, height); context.stroke();
  }
  for (let offset = 40; offset < height; offset += 40) {
    context.beginPath(); context.moveTo(0, offset); context.lineTo(width, offset); context.stroke();
  }
}

function drawLine(context, points, width, height, color, lineWidth) {
  if (points.length < 2) return;
  context.beginPath();
  context.moveTo(points[0].x * width, points[0].y * height);
  points.slice(1).forEach(point => context.lineTo(point.x * width, point.y * height));
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.stroke();
}

function drawPoints(context, points, width, height, fill, stroke, radius) {
  for (const point of points) {
    context.beginPath();
    context.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    context.fillStyle = fill; context.fill();
    context.strokeStyle = stroke; context.lineWidth = 2; context.stroke();
  }
}
