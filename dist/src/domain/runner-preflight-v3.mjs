import { haversine } from "./geometry.mjs";

export const PREFLIGHT_LIMITS = Object.freeze({
  maximumDistanceM: 250,
  minimumFreshnessMs: 10000,
});

export function evaluateRunnerPreflight({
  definition,
  sample,
  mapReady,
  mapError = null,
  nowMs,
}) {
  const reasons = [];
  if (!mapReady) {
    reasons.push({
      level: "red",
      text: `The survey map did not load${mapError ? `: ${mapError}` : "."}`,
    });
  }
  if (!sample?.success || !sample?.normalized) {
    reasons.push({
      level: "red",
      text: positionFailureText(sample),
    });
  } else {
    checkFixAge(definition, sample, nowMs, reasons);
    checkFloor(definition, sample, reasons);
    checkDistance(definition, sample, reasons);
  }
  const verdict = reasons.some(reason => reason.level === "red")
    ? "red"
    : reasons.length ? "amber" : "green";
  return {
    verdict,
    reasons,
    sampleId: sample?.id || "no-sample",
    acknowledged: false,
  };
}

function checkFixAge(definition, sample, nowMs, reasons) {
  const fixMs = Date.parse(sample.normalized.fixTime);
  const cadence = definition.meta.sourceConfig.pollIntervalMs;
  const maximumAgeMs = Math.max(
    PREFLIGHT_LIMITS.minimumFreshnessMs,
    cadence * 3,
  );
  if (!Number.isFinite(fixMs)) {
    reasons.push({
      level: "amber",
      text: "The provider did not report when this position was fixed.",
    });
  } else if (nowMs - fixMs > maximumAgeMs) {
    reasons.push({
      level: "amber",
      text: `The provider fix is stale (${Math.round((nowMs - fixMs) / 1000)} seconds old).`,
    });
  }
}

function checkFloor(definition, sample, reasons) {
  if (!definition.meta.zLevels.includes(sample.normalized.z)) {
    reasons.push({
      level: "amber",
      text: `Reported floor ${sample.normalized.z} is not in this survey.`,
    });
  }
}

function checkDistance(definition, sample, reasons) {
  const anchor = definition.route.stops[0];
  const distanceM = haversine(sample.normalized, anchor);
  if (distanceM > PREFLIGHT_LIMITS.maximumDistanceM) {
    reasons.push({
      level: "amber",
      text: `The reported position is ${Math.round(distanceM)} m from the survey route.`,
    });
  }
}

function positionFailureText(sample) {
  const detail = sample?.error || "The response contained no usable position";
  return `${detail}. Check the Client IP and confirm the device is on the wireless network.`;
}
