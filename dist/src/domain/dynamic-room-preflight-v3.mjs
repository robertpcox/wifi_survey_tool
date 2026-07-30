// FEATURE:      Dynamic room Runner preflight
// SURFACE:      Route-free map, source, sample, and freshness verdict
// WHY TOGETHER: Ad-hoc capture still needs trustworthy live positioning before polling starts.
// STATE:        None
// RULES:        No authored start, distance, or floor-membership check applies.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { PREFLIGHT_LIMITS } from "./runner-preflight-v3.mjs";

export function evaluateDynamicRoomPreflight({
  sample,
  mapReady,
  mapError = null,
  sourceReady,
  sourceError = null,
  nowMs,
  pollIntervalMs,
}) {
  const reasons = [];
  if (!mapReady) reasons.push(failure(
    `The survey map did not load${mapError ? `: ${mapError}` : "."}`,
  ));
  if (!sourceReady) reasons.push(failure(
    `The positioning source did not initialise`
      + `${sourceError ? `: ${sourceError}` : "."}`,
  ));
  if (!usableSample(sample)) {
    reasons.push(failure(positionFailureText(sample)));
  } else {
    checkFixAge(sample, nowMs, pollIntervalMs, reasons);
  }
  return {
    verdict: reasons.some(reason => reason.level === "red")
      ? "red"
      : reasons.length ? "amber" : "green",
    reasons,
    sampleId: sample?.id || "no-sample",
    acknowledged: false,
  };
}

function usableSample(sample) {
  const fix = sample?.normalized;
  return sample?.success === true
    && [fix?.lng, fix?.lat, fix?.z].every(Number.isFinite);
}

function checkFixAge(sample, nowValue, cadenceValue, reasons) {
  const nowMs = finiteAtLeast(nowValue, 0, "nowMs");
  const cadenceMs = finiteAtLeast(
    cadenceValue,
    1,
    "pollIntervalMs",
  );
  const fixMs = Date.parse(sample.normalized.fixTime);
  const maximumAgeMs = Math.max(
    PREFLIGHT_LIMITS.minimumFreshnessMs,
    cadenceMs * 3,
  );
  if (!Number.isFinite(fixMs)) {
    reasons.push({
      level: "amber",
      text: "The provider did not report when this position was fixed.",
    });
    return;
  }
  if (nowMs - fixMs > maximumAgeMs) {
    reasons.push({
      level: "amber",
      text: `The provider fix is stale (${Math.round((nowMs - fixMs) / 1000)} seconds old).`,
    });
  }
}

function positionFailureText(sample) {
  const detail = sample?.error || "The response contained no usable position";
  return `${detail}. Check the Client IP and confirm the device is on the wireless network.`;
}

function failure(text) {
  return { level: "red", text };
}

function finiteAtLeast(value, minimum, path) {
  if (!Number.isFinite(value) || value < minimum) {
    throw new TypeError(`${path}: must be a finite number at least ${minimum}`);
  }
  return value;
}
