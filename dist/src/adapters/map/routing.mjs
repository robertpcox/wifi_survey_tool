export async function fetchLegGeoJSON(Mazemap, from, to, collectionTag = "") {
  const bothPoiTargets = from.targetType === "poi"
    && to.targetType === "poi"
    && from.poiId != null
    && to.poiId != null;
  if (bothPoiTargets && typeof Mazemap.Data.getAtoBTrip === "function") {
    try {
      const parameters = {
        fromPoiId: from.poiId,
        toPoiId: to.poiId,
        mode: "PEDESTRIAN",
        constraint: "NONE",
      };
      if (collectionTag) parameters.campusCollectionTag = collectionTag;
      const trip = await Mazemap.Data.getAtoBTrip(parameters);
      const features = JSON.parse(JSON.stringify(trip?.features || []));
      if (features.length) return { type: "FeatureCollection", features };
      console.warn("getAtoBTrip returned no features, trying getRouteJSON");
    } catch (error) {
      console.warn("getAtoBTrip failed, trying getRouteJSON:", error);
    }
  }
  return Mazemap.Data.getRouteJSON(
    {
      lngLat: { lng: from.lng, lat: from.lat },
      zLevel: from.z,
    },
    {
      lngLat: { lng: to.lng, lat: to.lat },
      zLevel: to.z,
    },
  );
}

export function getPoiAt(Mazemap, lng, lat, z) {
  return Mazemap.Data.getPoiAt({ lng, lat }, z);
}

export function getPoi(Mazemap, poiId) {
  return Mazemap.Data.getPoi(poiId);
}
