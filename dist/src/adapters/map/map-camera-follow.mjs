// FEATURE:      Provider-neutral map camera follow
// SURFACE:      followMapPoint(map, point, options)
// WHY TOGETHER: Viewport-margin detection and provider camera fallback form one operation.
// STATE:        Reads only the current map bounds
// RULES:        Pan the existing map only; never reconstruct it or alter exact coordinates.
// PROVENANCE:   data/reference/report_player/ndh_player.html keepInView behavior

const DEFAULT_MARGIN_RATIO = 0.15;
const DEFAULT_DURATION_MS = 400;

export function followMapPoint(map, point, options = {}) {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  if (!map || !Number.isFinite(lng) || !Number.isFinite(lat)) return false;
  const marginRatio = validMargin(options.marginRatio);
  if (insideInset(map, lng, lat, marginRatio)) return false;
  const camera = {
    center: [lng, lat],
    duration: finiteDuration(options.durationMs),
  };
  if (typeof map.easeTo === "function") map.easeTo(camera);
  else if (typeof map.flyTo === "function") map.flyTo(camera);
  else return false;
  return true;
}

function insideInset(map, lng, lat, marginRatio) {
  if (typeof map.getBounds !== "function") return false;
  try {
    const bounds = map.getBounds();
    const west = Number(bounds?.getWest?.());
    const east = Number(bounds?.getEast?.());
    const south = Number(bounds?.getSouth?.());
    const north = Number(bounds?.getNorth?.());
    if (![west, east, south, north].every(Number.isFinite)
        || east <= west || north <= south) return false;
    const lngMargin = (east - west) * marginRatio;
    const latMargin = (north - south) * marginRatio;
    return lng >= west + lngMargin
      && lng <= east - lngMargin
      && lat >= south + latMargin
      && lat <= north - latMargin;
  } catch {
    return false;
  }
}

function validMargin(value) {
  const margin = Number(value);
  return Number.isFinite(margin) && margin >= 0 && margin < 0.5
    ? margin
    : DEFAULT_MARGIN_RATIO;
}

function finiteDuration(value) {
  const duration = Number(value);
  return Number.isFinite(duration) && duration >= 0
    ? duration
    : DEFAULT_DURATION_MS;
}
