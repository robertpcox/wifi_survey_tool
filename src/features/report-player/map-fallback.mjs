// FEATURE:      Report Player map failure fallback
// SURFACE:      drawRouteFallback(canvas, model)
// WHY TOGETHER: Schematic route, heat, trail, and walker drawing belong only to the error fallback.
// STATE:        Canvas pixels for the most recent fallback frame
// RULES:        Label this as fallback; the normal Report and Player surface is always MazeMap.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function drawRouteFallback(canvas, model) {
  const context = canvas?.getContext?.("2d");
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
  drawLine(context, model.pollTrail, width, height, "#2563eb", 3);
  drawPoints(context, model.checkpoints, width, height, "#ffffff", "#14213d", 5);
  if (model.walker) drawPoints(context, [model.walker], width, height, "#20a47a", "#ffffff", 8);
}

function drawGrid(context, width, height) {
  context.strokeStyle = "#d5dee9";
  context.lineWidth = 1;
  for (let offset = 40; offset < width; offset += 40) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, height);
    context.stroke();
  }
  for (let offset = 40; offset < height; offset += 40) {
    context.beginPath();
    context.moveTo(0, offset);
    context.lineTo(width, offset);
    context.stroke();
  }
}

function drawLine(context, points, width, height, color, lineWidth) {
  if (!points.length) return;
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
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = stroke;
    context.lineWidth = 2;
    context.stroke();
  }
}
