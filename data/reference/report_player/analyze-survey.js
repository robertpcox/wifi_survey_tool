(function(root){
"use strict";

const EARTH_RADIUS_M = 6371000;
const FROZEN_DISTANCE_M = 1;
const MIN_GROUND_TRUTH_MOVEMENT_M = 5;

function round(value, places){
  if(value == null || !Number.isFinite(value)) return null;
  const scale = Math.pow(10, places == null ? 1 : places);
  return Math.round(value * scale) / scale;
}

function haversine(lat1, lng1, lat2, lng2){
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLng = (lng2 - lng1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function quantile(values, percentile){
  const sorted = values.filter(Number.isFinite).slice().sort(function(a, b){ return a - b; });
  if(!sorted.length) return null;
  if(sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[Math.min(lower + 1, sorted.length - 1)] * weight;
}

function mean(values){
  const valid = values.filter(Number.isFinite);
  return valid.length ? valid.reduce(function(sum, value){ return sum + value; }, 0) / valid.length : null;
}

function lastPathPart(value){
  const parts = String(value || "").split(" > ");
  return parts[parts.length - 1] || "";
}

function alphaTag(index){
  let value = index + 1;
  let tag = "";
  while(value > 0){
    value--;
    tag = String.fromCharCode(65 + (value % 26)) + tag;
    value = Math.floor(value / 26);
  }
  return tag;
}

function stopName(stop, index){
  return (stop.tag || alphaTag(index)) + " — " + stop.label;
}

function dedupeCheckins(events){
  const byId = new Map();
  events.forEach(function(event){
    if(event.type === "checkin") byId.set(event.wpId, event);
  });
  return Array.from(byId.values()).sort(function(a, b){ return a.tMs - b.tMs; });
}

function buildTruthModel(raw){
  const events = raw.events.slice().sort(function(a, b){ return a.tMs - b.tMs; });
  const checkins = dedupeCheckins(events);
  if(checkins.length < 2) throw new Error("This survey does not contain enough ground-truth check-ins.");

  const departures = new Map();
  events.forEach(function(event){
    if(event.type === "depart") departures.set(event.wpId, event);
  });

  const points = [];
  checkins.forEach(function(checkin){
    points.push({
      t: checkin.tMs,
      lat: checkin.lat,
      lng: checkin.lng,
      z: Number(checkin.z),
      leg: checkin.legIdx,
      near: checkin.wpName,
      kind: checkin.wpKind
    });
    const depart = departures.get(checkin.wpId);
    if(depart && depart.tMs > checkin.tMs){
      points.push({
        t: depart.tMs,
        lat: checkin.lat,
        lng: checkin.lng,
        z: Number(checkin.z),
        leg: Math.min(checkin.legIdx + 1, raw.legs.length - 1),
        near: checkin.wpName,
        kind: "depart"
      });
    }
  });
  points.sort(function(a, b){ return a.t - b.t; });

  function at(timestamp){
    if(timestamp < points[0].t || timestamp > points[points.length - 1].t) return null;
    let low = 0;
    let high = points.length - 1;
    while(low < high){
      const middle = (low + high) >> 1;
      if(points[middle].t < timestamp) low = middle + 1;
      else high = middle;
    }
    if(points[low].t === timestamp) return Object.assign({}, points[low]);
    const before = points[Math.max(0, low - 1)];
    const after = points[low];
    const span = after.t - before.t;
    const fraction = span > 0 ? (timestamp - before.t) / span : 0;
    return {
      t: timestamp,
      lat: before.lat + (after.lat - before.lat) * fraction,
      lng: before.lng + (after.lng - before.lng) * fraction,
      z: before.z,
      leg: before.leg,
      near: fraction < 0.5 ? before.near : after.near,
      kind: fraction < 0.5 ? before.kind : after.kind
    };
  }

  function distanceBetween(startTimestamp, endTimestamp){
    const start = at(startTimestamp);
    const end = at(endTimestamp);
    if(!start || !end) return null;
    const travelled = [start]
      .concat(points.filter(function(point){
        return point.t > startTimestamp && point.t < endTimestamp;
      }))
      .concat([end]);
    let distance = 0;
    for(let index = 1; index < travelled.length; index++){
      distance += haversine(
        travelled[index - 1].lat,
        travelled[index - 1].lng,
        travelled[index].lat,
        travelled[index].lng
      );
    }
    return distance;
  }

  return {
    points: points,
    checkins: checkins,
    departures: departures,
    start: checkins[0].tMs,
    end: checkins[checkins.length - 1].tMs,
    at: at,
    distanceBetween: distanceBetween
  };
}

function validSamples(raw){
  return raw.samples
    .filter(function(sample){
      return sample && sample.ok && sample.data &&
        Number.isFinite(sample.tRecvMs) &&
        Number.isFinite(sample.data.latitude) &&
        Number.isFinite(sample.data.longitude) &&
        Number.isFinite(Number(sample.data.zLevel));
    })
    .slice()
    .sort(function(a, b){ return a.tRecvMs - b.tRecvMs; });
}

function nearestStop(stops, lat, lng, actualFloor){
  let candidates = stops.map(function(stop, index){ return { stop: stop, index: index }; })
    .filter(function(candidate){ return Number(candidate.stop.z) === Number(actualFloor); });
  if(!candidates.length){
    candidates = stops.map(function(stop, index){ return { stop: stop, index: index }; });
  }
  let best = null;
  candidates.forEach(function(candidate){
    const distance = haversine(lat, lng, candidate.stop.lat, candidate.stop.lng);
    if(!best || distance < best.distance){
      best = { stop: candidate.stop, index: candidate.index, distance: distance };
    }
  });
  return best;
}

function floorNames(raw, samples){
  const names = {};
  samples.forEach(function(sample){
    const z = String(Number(sample.data.zLevel));
    if(!names[z]){
      const area = lastPathPart(sample.data.locationName);
      names[z] = area.replace(/^OB\s+/, "") || ("Level " + String(Number(z) - 1).padStart(2, "0"));
    }
  });
  raw.stops.forEach(function(stop){
    const z = String(Number(stop.z));
    if(!names[z]) names[z] = "Level " + String(Number(z) - 1).padStart(2, "0");
  });
  return names;
}

function movingTime(raw, truth){
  const arrivals = new Map();
  raw.events.forEach(function(event){
    if(event.type === "arrive") arrivals.set(event.wpId, event);
  });
  const stopCheckins = truth.checkins.filter(function(checkin){ return checkin.wpKind === "stop"; });
  const legs = raw.legs.map(function(leg, index){
    const from = raw.stops[leg.fromIdx];
    const to = raw.stops[leg.toIdx];
    const fromCheckin = stopCheckins.find(function(checkin){ return checkin.wpName === stopName(from, leg.fromIdx); });
    const toCheckin = stopCheckins.find(function(checkin){ return checkin.wpName === stopName(to, leg.toIdx); });
    const depart = fromCheckin && truth.departures.get(fromCheckin.wpId);
    const arrival = toCheckin && (arrivals.get(toCheckin.wpId) || toCheckin);
    const start = index === 0 ? fromCheckin.tMs : (depart ? depart.tMs : fromCheckin.tMs);
    const end = arrival ? arrival.tMs : toCheckin.tMs;
    const legCheckins = [fromCheckin].concat(truth.checkins.filter(function(checkin){
      return checkin.legIdx === index && checkin.wpId !== fromCheckin.wpId;
    }));
    let distance = 0;
    for(let pointIndex = 1; pointIndex < legCheckins.length; pointIndex++){
      distance += haversine(
        legCheckins[pointIndex - 1].lat,
        legCheckins[pointIndex - 1].lng,
        legCheckins[pointIndex].lat,
        legCheckins[pointIndex].lng
      );
    }
    return {
      leg: index,
      from: stopName(from, leg.fromIdx),
      to: stopName(to, leg.toIdx),
      start: start,
      end: end,
      moving_s: (end - start) / 1000,
      dist_m: distance
    };
  });
  const movingSeconds = legs.reduce(function(sum, leg){ return sum + leg.moving_s; }, 0);
  const elapsedSeconds = (truth.end - truth.start) / 1000;
  return {
    legs: legs,
    movingSeconds: movingSeconds,
    elapsedSeconds: elapsedSeconds,
    dwellSeconds: Math.max(0, elapsedSeconds - movingSeconds),
    distance: legs.reduce(function(sum, leg){ return sum + leg.dist_m; }, 0)
  };
}

function buildTimeline(samples, truth, pollStart){
  return samples.map(function(sample){
    const sampleTruth = truth.at(sample.tSentMs);
    const error = sampleTruth ? haversine(
      sample.data.latitude,
      sample.data.longitude,
      sampleTruth.lat,
      sampleTruth.lng
    ) : null;
    return {
      t: round((sample.tRecvMs - pollStart) / 1000, 1),
      timestamp: sample.tRecvMs,
      truthTimestamp: sample.tSentMs,
      rtt: Number.isFinite(sample.rttMs) ? sample.rttMs : null,
      age: Number.isFinite(sample.data.lastSeen) ? round((sample.tRecvMs - sample.data.lastSeen) / 1000, 1) : null,
      err: error == null ? null : round(error, 2),
      z: String(Number(sample.data.zLevel)),
      tz: sampleTruth ? Number(sampleTruth.z) : null,
      tla: sampleTruth ? round(sampleTruth.lat, 8) : null,
      tln: sampleTruth ? round(sampleTruth.lng, 8) : null,
      near: sampleTruth ? sampleTruth.near : null,
      leg: sampleTruth ? sampleTruth.leg : null,
      area: lastPathPart(sample.data.locationName),
      lat: sample.data.latitude,
      lng: sample.data.longitude,
      lastSeen: sample.data.lastSeen
    };
  });
}

function findFrozenEpisodes(samples, truth, stops){
  const episodes = [];
  let runStart = null;

  function finish(endIndex){
    if(runStart == null || endIndex <= runStart){
      runStart = null;
      return;
    }
    const startSample = samples[runStart];
    const endSample = samples[endIndex];
    const startTruth = truth.at(startSample.tSentMs);
    const endTruth = truth.at(endSample.tSentMs);
    if(!startTruth || !endTruth){
      runStart = null;
      return;
    }
    const groundTruthDistance = truth.distanceBetween(startSample.tSentMs, endSample.tSentMs);
    if(groundTruthDistance <= MIN_GROUND_TRUTH_MOVEMENT_M){
      runStart = null;
      return;
    }
    const nearest = nearestStop(
      stops,
      startSample.data.latitude,
      startSample.data.longitude,
      startTruth.z
    );
    const lastSeenAdvanced = startSample.data.lastSeen !== endSample.data.lastSeen;
    episodes.push({
      start: startSample.tSentMs,
      end: endSample.tSentMs,
      dur: (endSample.tSentMs - startSample.tSentMs) / 1000,
      lat: startSample.data.latitude,
      lng: startSample.data.longitude,
      z: Number(startSample.data.zLevel),
      area: lastPathPart(startSample.data.locationName),
      stop: {
        name: stopName(nearest.stop, nearest.index),
        leg: Math.max(0, nearest.index - 1),
        dist_m: nearest.distance
      },
      leg: startTruth.leg,
      gt_m: groundTruthDistance,
      err_m: haversine(endSample.data.latitude, endSample.data.longitude, endTruth.lat, endTruth.lng),
      frozen: !lastSeenAdvanced
    });
    runStart = null;
  }

  for(let index = 1; index < samples.length; index++){
    const previous = samples[index - 1];
    const current = samples[index];
    const delta = haversine(
      previous.data.latitude,
      previous.data.longitude,
      current.data.latitude,
      current.data.longitude
    );
    if(delta < FROZEN_DISTANCE_M){
      if(runStart == null) runStart = index - 1;
    } else {
      finish(index - 1);
    }
  }
  finish(samples.length - 1);
  return episodes.sort(function(a, b){ return b.dur - a.dur; });
}

function mismatchWindows(timeline){
  const windows = [];
  let start = null;
  timeline.forEach(function(sample, index){
    const mismatch = sample.tz != null && Number(sample.z) !== Number(sample.tz);
    if(mismatch && start == null) start = index;
    if(!mismatch && start != null){
      const end = index - 1;
      windows.push({
        start: new Date(timeline[start].truthTimestamp).toISOString(),
        dur: (timeline[end].truthTimestamp - timeline[start].truthTimestamp) / 1000,
        rep_z: Number(timeline[start].z),
        true_z: Number(timeline[start].tz),
        near: timeline[start].near || "Floor change"
      });
      start = null;
    }
  });
  if(start != null){
    const end = timeline.length - 1;
    windows.push({
      start: new Date(timeline[start].truthTimestamp).toISOString(),
      dur: (timeline[end].truthTimestamp - timeline[start].truthTimestamp) / 1000,
      rep_z: Number(timeline[start].z),
      true_z: Number(timeline[start].tz),
      near: timeline[start].near || "Floor change"
    });
  }
  return windows.sort(function(a, b){ return b.dur - a.dur; });
}

function updateMetrics(samples, pollStart, durationMinutes){
  const intervals = [];
  const perMinute = new Map();
  let previousLastSeen = null;
  let previousFix = null;
  samples.forEach(function(sample){
    const lastSeen = sample.data.lastSeen;
    if(!Number.isFinite(lastSeen)) return;
    if(previousLastSeen == null || lastSeen !== previousLastSeen){
      if(previousFix != null) intervals.push((lastSeen - previousFix) / 1000);
      previousFix = lastSeen;
      const minute = Math.max(0, Math.floor((sample.tRecvMs - pollStart) / 60000));
      perMinute.set(minute, (perMinute.get(minute) || 0) + 1);
    }
    previousLastSeen = lastSeen;
  });
  const minuteCount = Math.max(1, Math.ceil(durationMinutes));
  const rows = [];
  for(let minute = 0; minute < minuteCount; minute++){
    rows.push({ m: minute, n: perMinute.get(minute) || 0 });
  }
  return {
    intervals: intervals.filter(function(value){ return value >= 0; }),
    rows: rows,
      rate: durationMinutes > 0 ? (intervals.length + (previousFix == null ? 0 : 1)) / durationMinutes : 0
  };
}

function reportPaths(timeline, floorName){
  const paths = {};
  Object.keys(floorName).forEach(function(z){ paths[z] = []; });
  timeline.forEach(function(sample, index){
    if(index % 2 !== 0 || sample.tz == null || sample.tla == null || sample.tln == null) return;
    const z = String(sample.tz);
    if(!paths[z]) paths[z] = [];
    paths[z].push([round(sample.tla, 7), round(sample.tln, 7)]);
  });
  return paths;
}

function perAreaRows(timeline, episodes, floorName){
  return Object.keys(floorName).map(function(z){
    const floor = "OB " + floorName[z];
    const floorEpisodes = episodes.filter(function(episode){ return String(episode.z) === z; });
    const errors = timeline
      .filter(function(sample){ return sample.err != null && String(sample.z) === z; })
      .map(function(sample){ return sample.err; });
    return {
      floor: floor,
      stuck_s: round(floorEpisodes.reduce(function(sum, episode){ return sum + episode.dur; }, 0), 1),
      eps: floorEpisodes.length,
      med_err: round(quantile(errors, 0.5), 1),
      p95_err: round(quantile(errors, 0.95), 1)
    };
  }).sort(function(a, b){ return b.stuck_s - a.stuck_s; });
}

function perStopRows(episodes){
  const grouped = new Map();
  episodes.forEach(function(episode){
    const current = grouped.get(episode.stop.name) || { stop: episode.stop.name, stuck_s: 0, eps: 0 };
    current.stuck_s += episode.dur;
    current.eps += 1;
    grouped.set(episode.stop.name, current);
  });
  return Array.from(grouped.values())
    .map(function(row){ row.stuck_s = round(row.stuck_s, 1); return row; })
    .sort(function(a, b){ return b.stuck_s - a.stuck_s; })
    .slice(0, 10);
}

function perLegRows(moving, timeline, episodes){
  return moving.legs.map(function(leg){
    const errors = timeline
      .filter(function(sample){ return sample.err != null && sample.leg === leg.leg; })
      .map(function(sample){ return sample.err; });
    const stuck = episodes
      .filter(function(episode){ return episode.leg === leg.leg; })
      .reduce(function(sum, episode){ return sum + episode.dur; }, 0);
    return {
      leg: leg.leg,
      from: leg.from,
      to: leg.to,
      moving_s: round(leg.moving_s, 1),
      dist_m: round(leg.dist_m, 1),
      stuck_s: round(stuck, 1),
      med_err: round(quantile(errors, 0.5), 1),
      p95_err: round(quantile(errors, 0.95), 1)
    };
  });
}

function analyzeSurvey(raw, options){
  options = options || {};
  if(!raw || raw.tool !== "route_survey") throw new Error("Choose a route_survey JSON export.");
  if(!Array.isArray(raw.stops) || !Array.isArray(raw.legs) || !Array.isArray(raw.events) || !Array.isArray(raw.samples)){
    throw new Error("The selected route survey is missing stops, legs, events, or samples.");
  }

  const samples = validSamples(raw);
  if(!samples.length) throw new Error("The selected route survey has no valid position samples.");
  const pollStart = samples[0].tRecvMs;
  const truth = buildTruthModel(raw);
  const moving = movingTime(raw, truth);
  const timeline = buildTimeline(samples, truth, pollStart);
  const episodes = findFrozenEpisodes(samples, truth, raw.stops);
  const mismatches = mismatchWindows(timeline);
  const names = floorNames(raw, samples);
  const durationMinutes = (samples[samples.length - 1].tRecvMs - pollStart) / 60000;
  const updates = updateMetrics(samples, pollStart, durationMinutes);
  const errors = timeline.filter(function(sample){ return sample.err != null; }).map(function(sample){ return sample.err; });
  const ages = timeline.filter(function(sample){ return sample.age != null; }).map(function(sample){ return sample.age; });
  const rtts = timeline.filter(function(sample){ return sample.rtt != null; }).map(function(sample){ return sample.rtt; });
  const totalStuckSeconds = episodes.reduce(function(sum, episode){ return sum + episode.dur; }, 0);
  const wrongFloorSamples = timeline.filter(function(sample){
    return sample.tz != null && Number(sample.z) !== Number(sample.tz);
  });
  const wrongFloorSeconds = mismatches.reduce(function(sum, mismatch){ return sum + mismatch.dur; }, 0);
  const validTruthCount = timeline.filter(function(sample){ return sample.tz != null; }).length;
  const date = new Date(truth.start).toISOString().slice(0, 10);
  const site = samples[0].data.locationName ?
    String(samples[0].data.locationName).split(" > ").slice(0, -1).join(" > ") :
    (raw.meta.routeName || "Route survey");
  const mainSession = {
    id: (raw.meta.routeName || "Route survey") + " · " + date,
    tool: "route_survey",
    day: date,
    dur_min: round(moving.elapsedSeconds / 60, 1),
    samples: samples.length,
    stale_med_s: round(quantile(ages, 0.5), 1),
    fix_med_s: round(quantile(updates.intervals, 0.5), 1),
    rtt_med: round(quantile(rtts, 0.5), 0),
    stuck_pct: moving.elapsedSeconds > 0 ? round(totalStuckSeconds / moving.elapsedSeconds * 100, 1) : 0,
    max_stall_s: episodes.length ? round(episodes[0].dur, 1) : 0,
    main: true
  };

  return {
    meta: {
      site: site,
      date: date,
      start: new Date(truth.start).toISOString(),
      end: new Date(truth.end).toISOString(),
      poll_start: new Date(pollStart).toISOString(),
      elapsed_min: round(moving.elapsedSeconds / 60, 1),
      moving_min: round(moving.movingSeconds / 60, 1),
      dwell_min: round(moving.dwellSeconds / 60, 1),
      dist_m: round(moving.distance, 1),
      stops: raw.stops.length,
      legs: raw.legs.length,
      samples: samples.length,
      checkins: truth.checkins.length,
      poll_s: round((raw.meta.intervalMs || 2000) / 1000, 1),
      source_file: options.sourceFile || null,
      http_non_200: raw.samples.filter(function(sample){ return sample.http !== 200; }).length
    },
    kpi: {
      stuck_pct: mainSession.stuck_pct,
      stuck_min: round(totalStuckSeconds / 60, 1),
      stuck_eps: episodes.length,
      longest_s: episodes.length ? round(episodes[0].dur, 1) : 0,
      fix_med_s: round(quantile(updates.intervals, 0.5), 1),
      fix_mean_s: round(mean(updates.intervals), 1),
      fix_max_s: round(Math.max.apply(null, updates.intervals.length ? updates.intervals : [0]), 1),
      rtt_med: round(quantile(rtts, 0.5), 0),
      rtt_p95: round(quantile(rtts, 0.95), 1),
      err_med: round(quantile(errors, 0.5), 1),
      err_p95: round(quantile(errors, 0.95), 1),
      err_max: round(Math.max.apply(null, errors.length ? errors : [0]), 1),
      wrong_floor_pct: validTruthCount ? round(wrongFloorSamples.length / validTruthCount * 100, 1) : 0,
      wrong_floor_s: round(wrongFloorSeconds, 1),
      upd_per_min: round(updates.rate, 2),
      stale_med_s: round(quantile(ages, 0.5), 1),
      stale_p95_s: round(quantile(ages, 0.95), 1),
      stale_max_s: round(Math.max.apply(null, ages.length ? ages : [0]), 1)
    },
    timeline: timeline.map(function(sample){
      return {
        t: sample.t,
        rtt: sample.rtt,
        age: sample.age,
        err: sample.err,
        z: sample.z,
        tz: sample.tz,
        tla: sample.tla,
        tln: sample.tln,
        near: sample.near
      };
    }),
    bands: episodes.map(function(episode){ return [episode.start, episode.end]; }),
    episodes: episodes.map(function(episode){
      return {
        t: episode.start,
        dur: round(episode.dur, 1),
        lat: round(episode.lat, 7),
        lng: round(episode.lng, 7),
        z: episode.z,
        stop: {
          name: episode.stop.name,
          leg: episode.stop.leg,
          dist_m: round(episode.stop.dist_m, 2)
        },
        gt_m: round(episode.gt_m, 1),
        err_m: round(episode.err_m, 1),
        frozen: episode.frozen
      };
    }),
    paths: reportPaths(timeline, names),
    stops: raw.stops.map(function(stop, index){
      const poiId = stop.poiId ?? stop.poi_id ?? stop.poi?.id ?? null;
      const locationType = stop.locationType ||
        (poiId != null ? "poi" : (/^outdoors?$/i.test(stop.poiName || stop.poi_name || "") ? "outdoors" : "unknown"));
      return {
        tag: stop.tag || alphaTag(index),
        label: stop.label,
        lat: round(stop.lat, 7),
        lng: round(stop.lng, 7),
        z: Number(stop.z),
        targetType: stop.targetType || (poiId != null ? "poi" : "point"),
        poiId: poiId,
        poiName: stop.poiName ?? stop.poi_name ?? stop.poi?.label ??
          (poiId != null ? stop.label : (locationType === "outdoors" ? "Outdoors" : null)),
        locationType: locationType,
        poi: stop.poi || null
      };
    }),
    floorName: names,
    perArea: perAreaRows(timeline, episodes, names),
    perStop: perStopRows(episodes),
    perLeg: perLegRows(moving, timeline, episodes),
    mismatch: mismatches.map(function(mismatch){
      return Object.assign({}, mismatch, { dur: round(mismatch.dur, 1) });
    }),
    updPerMin: updates.rows,
    sessions: [mainSession].concat(options.comparisonSessions || []),
    anomaly: options.anomaly || null
  };
}

root.NdhSurveyAnalyzer = {
  analyzeSurvey: analyzeSurvey,
  haversine: haversine,
  quantile: quantile
};

if(typeof module !== "undefined" && module.exports){
  module.exports = root.NdhSurveyAnalyzer;
}
})(typeof window !== "undefined" ? window : globalThis);
