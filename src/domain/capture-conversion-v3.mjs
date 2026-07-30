// FEATURE:      DesktopCloud capture conversion
// SURFACE:      captureDeviceGroups(captures), convertPositionCapture(spine, captures, options)
// WHY TOGETHER: Grouping external capture records and minting per-device v3 results is one contract.
// STATE:        None
// RULES:        Device identity defaults to the spine's run; overrides stay strictly validated as v3.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import { resultFilename } from "./runner-result-v3.mjs";
import { validateSurveyResultV3 } from "./survey-result-v3.mjs";

export function captureDeviceGroups(captures) {
  const groups = new Map();
  for (const record of captures) {
    if (!record || record.throttled || !record.clientIp) continue;
    const key = `${record.deviceName ?? record.deviceId ?? record.clientIp}|${record.clientIp}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  for (const records of groups.values()) {
    records.sort((left, right) => Date.parse(left.timeSent) - Date.parse(right.timeSent));
  }
  return groups;
}

export function convertPositionCapture(spine, captures, options = {}) {
  const { normalizeOutcome, resultId } = options;
  if (typeof normalizeOutcome !== "function") {
    throw new TypeError("options.normalizeOutcome must be a function");
  }
  if (typeof resultId !== "function") {
    throw new TypeError("options.resultId must be a function");
  }
  assertValidSpine(spine);
  const excluded = new Set(options.excludeClientIps ?? []);
  const overrides = options.deviceOverrides ?? {};
  const outputs = [];
  for (const [key, records] of captureDeviceGroups(captures)) {
    const [deviceName, clientIp] = key.split("|");
    if (excluded.has(clientIp)) continue;
    const override = overrides[clientIp] ?? {};
    const slug = deviceSlug(deviceName);
    const polls = records.map((record, index) => capturePoll(
      record,
      slug,
      index + 1,
      normalizeOutcome,
    ));
    if (!polls.length) continue;
    const result = {
      ...structuredClone(spine),
      run: {
        ...structuredClone(spine.run),
        resultId: resultId(),
        band: override.band ?? spine.run.band,
        device: {
          type: override.type ?? spine.run.device.type,
          os: override.os || "external-capture",
          name: override.name ?? deviceName,
          clientIp,
        },
        preflight: {
          ...structuredClone(spine.run.preflight),
          sampleId: polls[0].id,
        },
      },
      polls,
    };
    const validation = validateSurveyResultV3(result);
    if (!validation.valid) {
      throw new Error(
        `Converted result for ${deviceName} is invalid:\n${validation.errors.join("\n")}`,
      );
    }
    outputs.push({
      filename: resultFilename(result)
        .replace(/\.result\.v3\.json$/, `__${slug}.result.v3.json`),
      result,
    });
  }
  return outputs;
}

function assertValidSpine(spine) {
  let validation;
  try {
    validation = validateSurveyResultV3(spine);
  } catch (error) {
    throw new Error(`Spine result is not a valid v3 result: ${error.message}`);
  }
  if (!validation.valid) {
    throw new Error(
      `Spine result is not a valid v3 result:\n${validation.errors.slice(0, 5).join("\n")}`,
    );
  }
}

function capturePoll(record, slug, sequence, normalizeOutcome) {
  const data = record.data && typeof record.data === "object" ? record.data : {};
  return normalizeOutcome({
    id: `poll-${slug}-${sequence}`,
    sourceId: "mazemap-cloud",
    sentAt: record.timeSent,
    receivedAt: record.timeReceived,
    httpStatus: record.status ?? 0,
    success: record.status === 200,
    raw: data,
    error: record.status === 200
      ? null
      : (data.error ?? `Capture poll returned HTTP ${record.status}`),
  });
}

function deviceSlug(name) {
  return String(name ?? "device").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "device";
}
