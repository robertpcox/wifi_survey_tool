import { getPoi } from "../../adapters/map/routing.mjs";
import {
  outdoorsStop,
  poiToStop,
  pointToStop,
} from "../../domain/stop-targets.mjs";

export function createStopInput({ Mazemap, view, addRouteStop }) {
  async function addStopFromInput() {
    const input = view.stopInput();
    const raw = input.value.trim();
    if (!raw) return;
    const parts = raw.split(",").map(value => value.trim());
    if (isCoordinateInput(parts)) {
      const stop = coordinateStop(parts, view);
      if (!stop) return;
      addRouteStop(stop);
    } else if (/^\d+$/.test(raw)) {
      const stop = await lookupPoiStop(raw, Mazemap, view);
      if (!stop) return;
      addRouteStop(stop);
    } else {
      view.setStatus(
        "err",
        "Enter a numeric POI ID or lat,lng[,z[,outdoors]]",
      );
      return;
    }
    input.value = "";
    view.setStatus("ok", "Stop added — build the route when ready");
  }

  return { addStopFromInput };
}

function coordinateStop(parts, view) {
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  const z = parts.length > 2 ? parseFloat(parts[2]) : 1;
  let stop = pointToStop(lng, lat, z, null);
  if ((parts[3] || "").toLowerCase() === "outdoors") {
    stop = outdoorsStop(stop);
  } else if (parts[3] && parts[3].toLowerCase() !== "null") {
    view.setStatus("err", "The optional fourth value must be outdoors or null");
    return null;
  }
  return stop;
}

async function lookupPoiStop(raw, Mazemap, view) {
  try {
    const poi = await getPoi(Mazemap, parseInt(raw, 10));
    const stop = poiToStop(poi);
    if (!stop) {
      view.setStatus("err", `POI ${raw}: no usable geometry`);
      return null;
    }
    return stop;
  } catch (error) {
    view.setStatus("err", `POI ${raw} lookup failed: ${error.message}`);
    return null;
  }
}

function isCoordinateInput(parts) {
  return parts.length >= 2
    && !Number.isNaN(parseFloat(parts[0]))
    && !Number.isNaN(parseFloat(parts[1]));
}
