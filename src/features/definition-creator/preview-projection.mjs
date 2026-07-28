const WIDTH = 600;
const HEIGHT = 360;
const PADDING = 28;
const MAX_STACK_X = 56;
const MAX_STACK_Y = 96;

export function distinctPreviewLevels(points) {
  const levels = points
    .map(point => Number(point?.z))
    .filter(Number.isFinite);
  return levels.length
    ? [...new Set(levels)].sort((left, right) => left - right)
    : [0];
}

export function previewZ(point, fallback = 0) {
  const z = Number(point?.z);
  return Number.isFinite(z) ? z : fallback;
}

export function createPreviewProjection(points, levels) {
  const lngs = points.map(point => Number(point.lng));
  const lats = points.map(point => Number(point.lat));
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const levelGaps = levels.length - 1;
  const stepX = levelGaps ? Math.min(14, MAX_STACK_X / levelGaps) : 0;
  const stepY = levelGaps ? Math.min(24, MAX_STACK_Y / levelGaps) : 0;
  const totalX = levelGaps * stepX;
  const totalY = levelGaps * stepY;
  const availableWidth = WIDTH - PADDING * 2 - totalX;
  const availableHeight = HEIGHT - PADDING * 2 - totalY;
  const scale = Math.min(
    availableWidth / (maxLng - minLng || 1),
    availableHeight / (maxLat - minLat || 1),
  );
  const drawnWidth = (maxLng - minLng) * scale;
  const drawnHeight = (maxLat - minLat) * scale;
  const left = PADDING + (availableWidth - drawnWidth) / 2;
  const bottom = HEIGHT - PADDING - (availableHeight - drawnHeight) / 2;
  const ranks = new Map(levels.map((z, index) => [z, index]));
  const baseBox = [
    Math.max(PADDING, left - 12),
    Math.min(WIDTH - PADDING - totalX, left + drawnWidth + 12),
    Math.max(PADDING + totalY, bottom - drawnHeight - 12),
    Math.min(HEIGHT - PADDING, bottom + 12),
  ];

  function shift(z) {
    const rank = ranks.get(z) ?? 0;
    return [rank * stepX, -rank * stepY];
  }

  return {
    point(point) {
      const z = previewZ(point, levels[0]);
      const [x, y] = shift(z);
      return [
        left + (Number(point.lng) - minLng) * scale + x,
        bottom - (Number(point.lat) - minLat) * scale + y,
      ];
    },
    plane(z) {
      const [x, y] = shift(z);
      const [boxLeft, boxRight, boxTop, boxBottom] = baseBox;
      return [
        [boxLeft + x, boxBottom + y],
        [boxRight + x, boxBottom + y],
        [boxRight + x, boxTop + y],
        [boxLeft + x, boxTop + y],
      ];
    },
  };
}
