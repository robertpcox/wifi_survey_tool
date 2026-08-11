// FEATURE:      MazeMap exhaustive POI paging
// SURFACE:      fetchAllPoiPages(data, query, cache)
// WHY TOGETHER: Provider page shapes, cursor advancement, and per-building caching form one request.
// STATE:        Caller-owned promise cache
// RULES:        Follow getNextPage or max POI ID; a full page must always provide an advancing cursor.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

const PAGE_LIMIT = 2000;

export function fetchAllPoiPages(data, query, cache) {
  const key = `${query.campusid}:${query.buildingid ?? "campus"}`;
  if (!cache.has(key)) {
    const pending = fetchPages(data, query).catch(cause => {
      cache.delete(key);
      throw cause;
    });
    cache.set(key, pending);
  }
  return cache.get(key);
}

async function fetchPages(data, query) {
  const features = [];
  const cursors = new Set();
  let page = await data.getPois({ ...query, limit: PAGE_LIMIT, fromid: 0 });
  while (page) {
    const batch = providerFeatures(page);
    features.push(...batch);
    const cursor = nextCursor(batch);
    if (cursor != null) {
      if (cursors.has(cursor)) {
        throw new Error("MazeMap POI pagination did not advance");
      }
      cursors.add(cursor);
    }
    if (typeof page.getNextPage === "function") {
      page = await page.getNextPage();
    } else if (batch.length >= PAGE_LIMIT) {
      if (cursor == null) {
        throw new Error("MazeMap POI pagination cannot advance without POI IDs");
      }
      page = await data.getPois({ ...query, limit: PAGE_LIMIT, fromid: cursor });
    } else {
      page = null;
    }
  }
  return features;
}

function nextCursor(features) {
  const ids = features.map(feature => Number(
    feature?.properties?.poiId ?? feature?.properties?.id
      ?? feature?.poiId ?? feature?.id,
  )).filter(Number.isFinite);
  return ids.length ? Math.max(...ids) + 1 : null;
}

function providerFeatures(value) {
  if (Array.isArray(value)) return value.flatMap(providerFeatures);
  if (value?.type === "FeatureCollection") return value.features ?? [];
  if (value?.type === "Feature") return [value];
  if (value?.geojson) return providerFeatures(value.geojson);
  if (Array.isArray(value?.features)) return value.features;
  if (Array.isArray(value?.pois)) return value.pois.flatMap(providerFeatures);
  return value && typeof value === "object" && !value.getNextPage ? [value] : [];
}
